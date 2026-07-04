import { generateModification } from '../shared/ai';
import { LIBRARY, libraryItemToModification } from '../shared/library';
import { anyPatternMatches } from '../shared/match';
import { analyzeSafety, hasBlockers } from '../shared/safety';
import {
  deleteModification,
  disableAllModifications,
  getState,
  makeId,
  reportModificationRun,
  saveModification,
  saveSettings,
  toggleModification,
} from '../shared/storage';
import type { GeneratedModification, Modification, RuntimeMessage } from '../shared/types';

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => undefined);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) void applyForTab(tabId, tab.url);
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
  void handleMessage(message, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
  return true;
});

async function handleMessage(message: RuntimeMessage, sender: chrome.runtime.MessageSender): Promise<unknown> {
  switch (message.type) {
    case 'GET_STATE':
      return { ok: true, state: await getState(), library: LIBRARY };
    case 'SAVE_SETTINGS':
      await saveSettings(message.settings);
      return { ok: true };
    case 'GENERATE_MODIFICATION': {
      const state = await getState();
      const generated = await generateModification(state.settings, message.request);
      return { ok: true, generated };
    }
    case 'SAVE_MODIFICATION': {
      const safetyFindings = analyzeSafety(message.modification);
      const modifications = await saveModification({ ...message.modification, safetyFindings });
      await refreshActiveTab();
      return { ok: true, modifications };
    }
    case 'DELETE_MODIFICATION': {
      const modifications = await deleteModification(message.id);
      await refreshActiveTab();
      return { ok: true, modifications };
    }
    case 'DISABLE_ALL_MODIFICATIONS': {
      const modifications = await disableAllModifications();
      await refreshActiveTab();
      return { ok: true, modifications };
    }
    case 'REPORT_MODIFICATION_RUN': {
      const modifications = await reportModificationRun(message.id, message.status, message.message);
      return { ok: true, modifications };
    }
    case 'TOGGLE_MODIFICATION': {
      const modifications = await toggleModification(message.id, message.enabled);
      await refreshActiveTab();
      return { ok: true, modifications };
    }
    case 'INSTALL_LIBRARY_ITEM': {
      const item = LIBRARY.find((entry) => entry.id === message.itemId);
      if (!item) throw new Error('Library item not found.');
      const modifications = await saveModification(libraryItemToModification(item, message.matchPattern));
      await refreshActiveTab();
      return { ok: true, modifications };
    }
    case 'PAGE_READY':
    case 'ROUTE_CHANGED':
      if (sender.tab?.id && isInjectable(message.url)) await applyForTab(sender.tab.id, message.url);
      return { ok: true };
    case 'GET_PAGE_CONTEXT':
    case 'START_ELEMENT_PICKER':
    case 'HIGHLIGHT_SELECTED_ELEMENT':
    case 'CLEAR_ELEMENT_HIGHLIGHT':
    case 'APPLY_MODIFICATIONS':
      return { ok: false, error: 'This message is handled by the content script.' };
  }
}

export function generatedToModification(generated: GeneratedModification, sourcePrompt: string): Modification {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name: generated.name,
    description: generated.description,
    matchPatterns: generated.matchPatterns,
    type: generated.type,
    sourcePrompt,
    css: generated.css,
    javascript: generated.javascript,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    permissionsRequired: [],
    safetyStatus: 'generated',
  };
}

async function refreshActiveTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id && tab.url) await applyForTab(tab.id, tab.url);
}

async function applyForTab(tabId: number, url: string): Promise<void> {
  if (!isInjectable(url)) return;
  const state = await getState();
  const modifications = state.modifications.filter((mod) => mod.enabled && anyPatternMatches(url, mod.matchPatterns));
  await chrome.tabs.sendMessage(tabId, { type: 'APPLY_MODIFICATIONS', modifications }).catch(() => undefined);
  await runJavascriptModifications(tabId, modifications);
}

async function runJavascriptModifications(tabId: number, modifications: Modification[]): Promise<void> {
  for (const mod of modifications) {
    if (!mod.javascript) continue;
    const findings = analyzeSafety(mod);
    if (hasBlockers(findings)) {
      await reportModificationRun(
        mod.id,
        'error',
        `Blocked by safety scanner: ${findings
          .filter((finding) => finding.severity === 'blocker')
          .map((finding) => finding.category)
          .join(', ')}`,
      );
      continue;
    }
    await chrome.scripting
      .executeScript({
        target: { tabId },
        world: 'MAIN',
        injectImmediately: false,
        func: (code: string, marker: string) => {
          const root = document.documentElement;
          if (root.getAttribute(marker)) return;
          root.setAttribute(marker, 'true');
          // Execute in the page's main world so code that works in DevTools Console
          // sees the same window/document/page globals when run by FlexWeb.
          new Function(code)();
        },
        args: [mod.javascript, `flexweb-script-${mod.id}-${mod.updatedAt}`],
      })
      .then(() => reportModificationRun(mod.id, 'applied'))
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.warn('FlexWeb JavaScript modification failed', mod.name, error);
        return reportModificationRun(mod.id, 'error', message);
      });
  }
}

function isInjectable(url: string): boolean {
  return /^(https?|file):/.test(url);
}
