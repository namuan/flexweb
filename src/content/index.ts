import type { Modification, PageContext, RuntimeMessage, SelectedElement } from '../shared/types';

const STYLE_PREFIX = 'flexweb-style-';
let activeIds = new Set<string>();
let selectedHighlight: { overlay: HTMLDivElement; label: HTMLDivElement; selector: string; intervalId: number } | null = null;

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  try {
    if (message.type === 'GET_PAGE_CONTEXT') sendResponse({ ok: true, context: collectPageContext() });
    if (message.type === 'START_ELEMENT_PICKER') {
      startElementPicker().then((element) => sendResponse({ ok: true, element })).catch((error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
    if (message.type === 'HIGHLIGHT_SELECTED_ELEMENT') {
      highlightSelectedElement(message.selector);
      sendResponse({ ok: true });
    }
    if (message.type === 'CLEAR_ELEMENT_HIGHLIGHT') {
      clearSelectedHighlight();
      sendResponse({ ok: true });
    }
    if (message.type === 'APPLY_MODIFICATIONS') {
      applyModifications(message.modifications);
      sendResponse({ ok: true });
    }
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
  return true;
});

chrome.runtime.sendMessage({ type: 'GET_STATE' }).then((response) => {
  const url = location.href;
  const mods = (response?.state?.modifications ?? []) as Modification[];
  applyModifications(mods.filter((mod) => mod.enabled && mod.matchPatterns.some((pattern) => matchesHere(url, pattern))));
}).catch(() => undefined);

chrome.runtime.sendMessage({ type: 'PAGE_READY', url: location.href }).catch(() => undefined);

installSpaObserver();

function collectPageContext(): PageContext {
  const headings = Array.from(document.querySelectorAll('h1,h2,h3'))
    .map((el) => clean(el.textContent ?? ''))
    .filter(Boolean)
    .slice(0, 16);
  return {
    url: location.href,
    title: document.title,
    selectedText: clean(String(window.getSelection?.() ?? '')).slice(0, 3000),
    headings,
    visibleTextSample: clean(document.body?.innerText ?? '').slice(0, 6000),
    elementSummary: summarizeElements()
  };
}

function summarizeElements(): PageContext['elementSummary'] {
  const candidates = Array.from(document.querySelectorAll('header, nav, main, aside, footer, section, article, button, a, [role], [class]'));
  return candidates
    .filter((element) => isVisible(element) && !isSensitive(element))
    .slice(0, 60)
    .map((element) => ({
      selector: selectorFor(element),
      role: element.getAttribute('role') || element.tagName.toLowerCase(),
      text: clean(element.textContent ?? '').slice(0, 120)
    }))
    .filter((item) => item.text || item.role !== 'div')
    .slice(0, 30);
}

function isVisible(element: Element): boolean {
  const box = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function isSensitive(element: Element): boolean {
  return Boolean(element.closest('input[type="password"], input[type="email"], input[type="tel"], input[name*="token" i], input[name*="card" i], textarea, [autocomplete="cc-number"]'));
}

function selectorFor(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const tag = element.tagName.toLowerCase();
  const stableClass = Array.from(element.classList).find((name) => /^[a-z][a-z0-9_-]{2,}$/i.test(name));
  if (stableClass) return `${tag}.${CSS.escape(stableClass)}`;
  const role = element.getAttribute('role');
  if (role) return `${tag}[role="${CSS.escape(role)}"]`;
  return tag;
}

function preciseSelectorFor(element: Element): string {
  if (element.id) return `#${CSS.escape(element.id)}`;
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement && parts.length < 5) {
    let part = current.tagName.toLowerCase();
    const stableClass = Array.from(current.classList).find((name) => /^[a-z][a-z0-9_-]{2,}$/i.test(name));
    if (stableClass) part += `.${CSS.escape(stableClass)}`;
    const parent: Element | null = current.parentElement;
    if (parent) {
      const currentTag = current.tagName;
      const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === currentTag);
      if (siblings.length > 1 && !stableClass) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parent;
  }
  return parts.join(' > ');
}

function describeElement(element: Element): SelectedElement {
  const attributes: Record<string, string> = {};
  for (const name of ['id', 'class', 'role', 'aria-label', 'title', 'data-testid']) {
    const value = element.getAttribute(name);
    if (value) attributes[name] = value.slice(0, 200);
  }
  const path: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement && path.length < 6) {
    path.unshift(selectorFor(current));
    current = current.parentElement;
  }
  return {
    selector: preciseSelectorFor(element),
    tagName: element.tagName.toLowerCase(),
    role: element.getAttribute('role') || element.tagName.toLowerCase(),
    text: clean(element.textContent ?? '').slice(0, 500),
    attributes,
    path
  };
}

function startElementPicker(): Promise<SelectedElement> {
  return new Promise((resolve, reject) => {
    clearSelectedHighlight();
    const overlay = document.createElement('div');
    const label = document.createElement('div');
    const blocker = document.createElement('div');
    let current: Element | null = null;

    overlay.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;border:2px solid #2563eb;background:rgba(37,99,235,.16);box-shadow:0 0 0 99999px rgba(15,23,42,.18);display:none;border-radius:3px;';
    label.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;background:#111827;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:5px 7px;border-radius:6px;display:none;max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    blocker.style.cssText = 'position:fixed;inset:0;z-index:2147483646;cursor:crosshair;background:transparent;';
    blocker.setAttribute('aria-label', 'FlexWeb element picker active');
    document.documentElement.append(overlay, label, blocker);

    const cleanup = (): void => {
      blocker.removeEventListener('mousemove', onMove, true);
      blocker.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeyDown, true);
      overlay.remove();
      label.remove();
      blocker.remove();
    };

    const elementFromPoint = (event: MouseEvent): Element | null => {
      blocker.style.pointerEvents = 'none';
      const element = document.elementFromPoint(event.clientX, event.clientY);
      blocker.style.pointerEvents = 'auto';
      return element && !isSensitive(element) ? element : null;
    };

    const onMove = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      current = elementFromPoint(event);
      if (!current) return;
      const rect = current.getBoundingClientRect();
      overlay.style.display = 'block';
      overlay.style.left = `${Math.max(0, rect.left)}px`;
      overlay.style.top = `${Math.max(0, rect.top)}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      label.style.display = 'block';
      label.style.left = `${Math.max(8, rect.left)}px`;
      label.style.top = `${Math.max(8, rect.top - 30)}px`;
      label.textContent = `${current.tagName.toLowerCase()} ${preciseSelectorFor(current)}`;
    };

    const onClick = (event: MouseEvent): void => {
      event.preventDefault();
      event.stopPropagation();
      const selected = current ?? elementFromPoint(event);
      cleanup();
      if (!selected) reject(new Error('No selectable element was picked.'));
      else {
        const description = describeElement(selected);
        highlightSelectedElement(description.selector);
        resolve(description);
      }
    };

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cleanup();
      reject(new Error('Element selection cancelled.'));
    };

    blocker.addEventListener('mousemove', onMove, true);
    blocker.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeyDown, true);
  });
}

function highlightSelectedElement(selector: string): void {
  clearSelectedHighlight();
  const element = document.querySelector(selector);
  if (!element) return;
  const overlay = document.createElement('div');
  const label = document.createElement('div');
  overlay.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;border:2px solid #f59e0b;background:rgba(245,158,11,.18);box-shadow:0 0 0 1px rgba(17,24,39,.35),0 8px 30px rgba(245,158,11,.35);border-radius:3px;';
  label.style.cssText = 'position:fixed;z-index:2147483645;pointer-events:none;background:#92400e;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:5px 7px;border-radius:6px;max-width:340px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
  label.textContent = `FlexWeb target: ${selector}`;
  document.documentElement.append(overlay, label);
  const update = (): void => {
    const target = document.querySelector(selector);
    if (!target) {
      clearSelectedHighlight();
      return;
    }
    const rect = target.getBoundingClientRect();
    overlay.style.left = `${Math.max(0, rect.left)}px`;
    overlay.style.top = `${Math.max(0, rect.top)}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.display = rect.width > 0 && rect.height > 0 ? 'block' : 'none';
    label.style.left = `${Math.max(8, rect.left)}px`;
    label.style.top = `${Math.max(8, rect.top - 30)}px`;
  };
  const intervalId = window.setInterval(update, 250);
  selectedHighlight = { overlay, label, selector, intervalId };
  update();
}

function clearSelectedHighlight(): void {
  if (!selectedHighlight) return;
  window.clearInterval(selectedHighlight.intervalId);
  selectedHighlight.overlay.remove();
  selectedHighlight.label.remove();
  selectedHighlight = null;
}

function applyModifications(modifications: Modification[]): void {
  const nextIds = new Set(modifications.map((mod) => mod.id));
  for (const id of activeIds) {
    if (!nextIds.has(id)) document.getElementById(`${STYLE_PREFIX}${id}`)?.remove();
  }
  activeIds = nextIds;
  for (const mod of modifications) {
    if (mod.css) upsertStyle(mod.id, mod.css);
  }
}

function upsertStyle(id: string, css: string): void {
  const elementId = `${STYLE_PREFIX}${id}`;
  let style = document.getElementById(elementId) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = elementId;
    document.documentElement.appendChild(style);
  }
  style.textContent = css;
}

function installSpaObserver(): void {
  let previous = location.href;
  setInterval(() => {
    if (location.href === previous) return;
    previous = location.href;
    chrome.runtime.sendMessage({ type: 'ROUTE_CHANGED', url: location.href }).catch(() => undefined);
    chrome.runtime.sendMessage({ type: 'GET_STATE' }).then((response) => {
      const mods = (response?.state?.modifications ?? []) as Modification[];
      applyModifications(mods.filter((mod) => mod.enabled && mod.matchPatterns.some((pattern) => matchesHere(location.href, pattern))));
    }).catch(() => undefined);
  }, 800);
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function matchesHere(rawUrl: string, pattern: string): boolean {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(rawUrl);
}
