import React, { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { Brand, ModificationList } from './components';
import { deleteModification, generate, generatedToModification, getPageContext, getState, saveModification, startElementPicker, toggleModification } from './client';
import type { GeneratedModification, Modification, PageContext, SelectedElement } from '../shared/types';

function SidePanel(): ReactElement {
  const [prompt, setPrompt] = useState('Hide distracting sidebars and make the article easier to read.');
  const [context, setContext] = useState<PageContext | null>(null);
  const [generated, setGenerated] = useState<GeneratedModification | null>(null);
  const [mods, setMods] = useState<Modification[]>([]);
  const [targetElement, setTargetElement] = useState<SelectedElement | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { getState().then(({ state }) => setMods(state.modifications)); getPageContext().then(setContext).catch(() => undefined); }, []);
  async function runGenerate(): Promise<void> { setBusy(true); setError(''); try { const page = context ?? await getPageContext(); const scopedPage = targetElement ? { ...page, targetElement, elementSummary: [{ selector: targetElement.selector, role: targetElement.role, text: targetElement.text }] } : page; setContext(scopedPage); setGenerated(await generate(prompt, scopedPage)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); } }
  async function pickElement(): Promise<void> { setPicking(true); setError(''); try { setTargetElement(await startElementPicker()); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setPicking(false); } }
  async function approve(): Promise<void> { if (!generated) return; setMods(await saveModification(generatedToModification(generated, prompt))); setGenerated(null); }
  return <main className="shell side"><Brand/><section className="panel stack"><div><span className="pill">Current page context</span><p className="muted">{context ? context.title : 'Click refresh if the page context is unavailable.'}</p></div>{targetElement && <div className="panel stack"><span className="pill">Targeted element</span><p className="muted"><strong>{targetElement.selector}</strong></p><p className="tiny muted">{targetElement.text || targetElement.role}</p><button className="ghost" onClick={()=>setTargetElement(null)}>Clear element target</button></div>}<textarea value={prompt} onChange={(e)=>setPrompt(e.target.value)} placeholder="Describe how this site should change..."/><div className="row"><button disabled={busy || !prompt.trim()} onClick={runGenerate}>{busy ? 'Generating…' : targetElement ? 'Generate for selected element' : 'Generate modification'}</button><button className="secondary" disabled={picking} onClick={pickElement}>{picking ? 'Pick on page…' : 'Select element'}</button><button className="secondary" onClick={()=>getPageContext().then(setContext)}>Refresh context</button></div>{error && <p className="danger">{error}</p>}</section>{generated && <section className="panel stack"><div className="row"><div><h2>{generated.name}</h2><p className="muted">{generated.description}</p></div><span className="pill">{generated.riskLevel}</span></div>{generated.refinedPrompt && <p className="muted"><strong>Refined intent:</strong> {generated.refinedPrompt}</p>}{generated.implementationPlan?.length ? <ol className="muted">{generated.implementationPlan.map((step)=><li key={step}>{step}</li>)}</ol> : null}<p>{generated.explanation}</p>{generated.css && <pre className="code">{generated.css}</pre>}{generated.javascript && <pre className="code">{generated.javascript}</pre>}<button onClick={approve}>Approve & save</button></section>}<section className="panel"><ModificationList modifications={mods} onToggle={(id,en)=>toggleModification(id,en).then(setMods)} onDelete={(id)=>deleteModification(id).then(setMods)} onSave={(mod)=>saveModification(mod).then(setMods)} onRegenerate={async (prompt)=>{ const page = context ?? await getPageContext(); setContext(page); return generate(prompt, page); }}/></section></main>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><SidePanel /></React.StrictMode>);
