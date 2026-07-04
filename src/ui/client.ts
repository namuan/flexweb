import type { AppState, GeneratedModification, LibraryItem, Modification, PageContext, ProviderSettings, RuntimeMessage, SelectedElement } from '../shared/types';
import { makeId } from '../shared/storage';

type Ok<T> = { ok: true } & T;

export async function send<T>(message: RuntimeMessage, tabId?: number): Promise<T> {
  const response = tabId ? await chrome.tabs.sendMessage(tabId, message) : await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error ?? 'Unknown FlexWeb error');
  return response as T;
}

export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

export async function getState(): Promise<{ state: AppState; library: LibraryItem[] }> {
  const response = await send<Ok<{ state: AppState; library: LibraryItem[] }>>({ type: 'GET_STATE' });
  return { state: response.state, library: response.library };
}

export async function getPageContext(): Promise<PageContext> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab available.');
  if (!tab.url || !isInjectablePage(tab.url)) {
    throw new Error('FlexWeb cannot read this page. Open an http, https, or file page and try again. Browser internal pages and the Chrome Web Store are restricted.');
  }
  const response = await sendToContentWithFallback<Ok<{ context: PageContext }>>(tab.id, { type: 'GET_PAGE_CONTEXT' });
  return response.context;
}

export async function startElementPicker(): Promise<SelectedElement> {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab available.');
  if (!tab.url || !isInjectablePage(tab.url)) {
    throw new Error('FlexWeb cannot select elements on this page. Open an http, https, or file page and try again.');
  }
  const response = await sendToContentWithFallback<Ok<{ element: SelectedElement }>>(tab.id, { type: 'START_ELEMENT_PICKER' });
  return response.element;
}

export async function clearElementHighlight(): Promise<void> {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url || !isInjectablePage(tab.url)) return;
  await sendToContentWithFallback<Ok<Record<string, never>>>(tab.id, { type: 'CLEAR_ELEMENT_HIGHLIGHT' }).catch(() => undefined);
}

async function sendToContentWithFallback<T>(tabId: number, message: RuntimeMessage): Promise<T> {
  try {
    return await send<T>(message, tabId);
  } catch (error) {
    if (!isMissingReceiverError(error)) throw error;
    await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    return send<T>(message, tabId);
  }
}

function isMissingReceiverError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Receiving end does not exist') || message.includes('Could not establish connection');
}

function isInjectablePage(url: string): boolean {
  return /^(https?|file):/.test(url);
}

export async function saveSettings(settings: ProviderSettings): Promise<void> {
  await send({ type: 'SAVE_SETTINGS', settings });
}

export async function saveModification(modification: Modification): Promise<Modification[]> {
  const response = await send<Ok<{ modifications: Modification[] }>>({ type: 'SAVE_MODIFICATION', modification });
  return response.modifications;
}

export async function toggleModification(id: string, enabled: boolean): Promise<Modification[]> {
  const response = await send<Ok<{ modifications: Modification[] }>>({ type: 'TOGGLE_MODIFICATION', id, enabled });
  return response.modifications;
}

export async function deleteModification(id: string): Promise<Modification[]> {
  const response = await send<Ok<{ modifications: Modification[] }>>({ type: 'DELETE_MODIFICATION', id });
  return response.modifications;
}

export async function disableAllModifications(): Promise<Modification[]> {
  const response = await send<Ok<{ modifications: Modification[] }>>({ type: 'DISABLE_ALL_MODIFICATIONS' });
  return response.modifications;
}

export async function installLibraryItem(itemId: string, matchPattern: string): Promise<Modification[]> {
  const response = await send<Ok<{ modifications: Modification[] }>>({ type: 'INSTALL_LIBRARY_ITEM', itemId, matchPattern });
  return response.modifications;
}

export async function generate(prompt: string, pageContext: PageContext): Promise<GeneratedModification> {
  const response = await withTimeout(
    send<Ok<{ generated: GeneratedModification }>>({ type: 'GENERATE_MODIFICATION', request: { prompt, pageContext } }),
    75000,
    'Generation timed out. The model may still have responded, but the extension did not receive a complete result. Try again or choose a faster model.'
  );
  return response.generated;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export function generatedToModification(generated: GeneratedModification, prompt: string): Modification {
  const now = new Date().toISOString();
  return {
    id: makeId(),
    name: generated.name,
    description: generated.description,
    matchPatterns: generated.matchPatterns,
    type: generated.type,
    sourcePrompt: prompt,
    css: generated.css,
    javascript: generated.javascript,
    enabled: true,
    createdAt: now,
    updatedAt: now,
    permissionsRequired: [],
    safetyStatus: 'user-reviewed',
    safetyFindings: generated.safetyFindings,
    rollbackNotes: generated.rollbackNotes
  };
}
