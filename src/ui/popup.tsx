import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Brand, ModificationList } from './components';
import { deleteModification, disableAllModifications, generate, getPageContext, getState, saveModification, toggleModification } from './client';
import type { Modification } from '../shared/types';

function Popup(): ReactElement {
  const [mods, setMods] = useState<Modification[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { getState().then(({ state }) => setMods(state.modifications)).catch((e) => setError(String(e))); }, []);
  return <main className="shell"><Brand/><section className="panel stack"><button onClick={() => chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT })}>Open FlexWeb Studio</button><button className="secondary" onClick={() => chrome.runtime.openOptionsPage()}>Options & Library</button><button className="ghost danger" onClick={()=>disableAllModifications().then(setMods)}>Emergency disable all</button>{error && <p className="danger">{error}</p>}</section><section className="panel"><ModificationList modifications={mods} onToggle={(id,en)=>toggleModification(id,en).then(setMods)} onDelete={(id)=>deleteModification(id).then(setMods)} onSave={(mod)=>saveModification(mod).then(setMods)} onRegenerate={async (prompt)=>{ if (!window.confirm('Regenerating sends your prompt and current page context to your configured AI provider. Continue?')) throw new Error('Regeneration cancelled.'); return generate(prompt, await getPageContext()); }}/></section></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><Popup /></React.StrictMode>);
