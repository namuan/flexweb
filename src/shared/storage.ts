import type { AppState, Modification, ProviderSettings } from './types';

const DEFAULT_SETTINGS: ProviderSettings = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'openai/gpt-4o-mini',
  privacyMode: 'page-context'
};

export async function getState(): Promise<AppState> {
  const stored = await chrome.storage.local.get(['modifications', 'settings']);
  return {
    modifications: Array.isArray(stored.modifications) ? stored.modifications : [],
    settings: { ...DEFAULT_SETTINGS, ...(stored.settings ?? {}) }
  };
}

export async function saveSettings(settings: ProviderSettings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export async function saveModification(modification: Modification): Promise<Modification[]> {
  const state = await getState();
  const next = [modification, ...state.modifications.filter((item) => item.id !== modification.id)];
  await chrome.storage.local.set({ modifications: next });
  return next;
}

export async function deleteModification(id: string): Promise<Modification[]> {
  const state = await getState();
  const next = state.modifications.filter((item) => item.id !== id);
  await chrome.storage.local.set({ modifications: next });
  return next;
}

export async function toggleModification(id: string, enabled: boolean): Promise<Modification[]> {
  const state = await getState();
  const now = new Date().toISOString();
  const next = state.modifications.map((item) => (item.id === id ? { ...item, enabled, updatedAt: now } : item));
  await chrome.storage.local.set({ modifications: next });
  return next;
}

export function makeId(prefix = 'mod'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
