import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { patternForUrl } from '../shared/match';
import type { LibraryItem, Modification, ProviderSettings } from '../shared/types';
import {
  deleteModification,
  disableAllModifications,
  generate,
  getActiveTab,
  getPageContext,
  getState,
  installLibraryItem,
  modificationsForUrl,
  saveModification,
  saveSettings,
  toggleModification,
  websiteLabel,
} from './client';
import { Brand, ModificationList } from './components';

function Options(): ReactElement {
  const [settings, setSettings] = useState<ProviderSettings>({ baseUrl: '', apiKey: '', model: '', privacyMode: 'page-context' });
  const [mods, setMods] = useState<Modification[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeUrl, setActiveUrl] = useState<string>();
  const [saved, setSaved] = useState('');

  useEffect(() => {
    getState().then(({ state, library }) => {
      setSettings(state.settings);
      setMods(state.modifications);
      setLibrary(library);
    });
    getActiveTab().then((tab) => setActiveUrl(tab?.url));
  }, []);

  const siteMods = useMemo(() => modificationsForUrl(mods, activeUrl), [mods, activeUrl]);

  async function install(id: string): Promise<void> {
    const tab = await getActiveTab();
    const pattern = tab?.url ? patternForUrl(tab.url) : 'https://*/*';
    setMods(await installLibraryItem(id, pattern));
  }

  return (
    <main className="shell">
      <div className="option-page">
        <Brand />
        <section className="panel stack">
          <h2>OpenAI-compatible provider</h2>
          <p className="muted">OpenRouter works out of the box. Your key is stored locally in Chrome extension storage.</p>
          <input value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} placeholder="https://openrouter.ai/api/v1" />
          <input value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} placeholder="openai/gpt-4o-mini" />
          <input type="password" value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} placeholder="API key" />
          <select value={settings.privacyMode} onChange={(e) => setSettings({ ...settings, privacyMode: e.target.value as ProviderSettings['privacyMode'] })}>
            <option value="page-context">Ask with approved page context</option>
            <option value="strict">Strict: minimal context</option>
          </select>
          <button onClick={() => saveSettings(settings).then(() => setSaved('Saved'))}>Save settings</button>
          {saved && <p className="muted">{saved}</p>}
        </section>
        <section className="panel">
          <h2>Built-in library</h2>
          <div className="library">
            {library.map((item) => (
              <article className="mod" key={item.id}>
                <h3>{item.title}</h3>
                <p className="muted">{item.description}</p>
                <span className="pill">{item.category}</span>
                <p>
                  <button className="secondary" onClick={() => install(item.id)}>
                    Install for active site
                  </button>
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="row">
            <div>
              <h2>{websiteLabel(activeUrl)} modifications</h2>
              <p className="muted tiny">Showing only modifications matching the current website. Other sites remain saved and active on their own pages.</p>
            </div>
            <button className="ghost danger" onClick={() => disableAllModifications().then(setMods)}>
              Emergency disable all
            </button>
          </div>
          <ModificationList
            modifications={siteMods}
            onToggle={(id, en) => toggleModification(id, en).then(setMods)}
            onDelete={(id) => deleteModification(id).then(setMods)}
            onSave={(mod) => saveModification(mod).then(setMods)}
            onRegenerate={async (prompt) => {
              if (!window.confirm('Regenerating sends your prompt and current page context to your configured AI provider. Continue?'))
                throw new Error('Regeneration cancelled.');
              return generate(prompt, await getPageContext());
            }}
          />
        </section>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
);
