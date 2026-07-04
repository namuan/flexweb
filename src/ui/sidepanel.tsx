import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import type { GeneratedModification, Modification, PageContext, SelectedElement } from '../shared/types';
import {
  clearElementHighlight,
  deleteModification,
  generate,
  generatedToModification,
  getActiveTab,
  getPageContext,
  getState,
  modificationsForUrl,
  saveModification,
  startElementPicker,
  toggleModification,
  websiteLabel,
} from './client';
import { Brand, ModificationList } from './components';

type ContextMode = 'page' | 'selected-text' | 'minimal';

function SidePanel(): ReactElement {
  const [prompt, setPrompt] = useState('Hide distracting sidebars and make the article easier to read.');
  const [context, setContext] = useState<PageContext | null>(null);
  const [contextMode, setContextMode] = useState<ContextMode>('page');
  const [consent, setConsent] = useState(false);
  const [generated, setGenerated] = useState<GeneratedModification | null>(null);
  const [mods, setMods] = useState<Modification[]>([]);
  const [activeUrl, setActiveUrl] = useState<string>();
  const [targetElement, setTargetElement] = useState<SelectedElement | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getState().then(({ state }) => setMods(state.modifications));
    getPageContext()
      .then(setContext)
      .catch(() => undefined);
    getActiveTab().then((tab) => setActiveUrl(tab?.url));
  }, []);

  const contextPreview = useMemo(() => describeContext(context, contextMode, targetElement), [context, contextMode, targetElement]);
  const siteMods = useMemo(() => modificationsForUrl(mods, activeUrl), [mods, activeUrl]);

  async function runGenerate(): Promise<void> {
    if (!consent) {
      setError('Review the context summary and confirm consent before sending data to the AI provider.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const page = context ?? (await getPageContext());
      const scopedPage = contextForMode(page, contextMode, targetElement);
      setContext(scopedPage);
      setGenerated(await generate(prompt, scopedPage));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function pickElement(): Promise<void> {
    setPicking(true);
    setError('');
    try {
      setTargetElement(await startElementPicker());
      setContextMode('page');
      setConsent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPicking(false);
    }
  }

  async function clearTargetElement(): Promise<void> {
    setTargetElement(null);
    setConsent(false);
    await clearElementHighlight();
  }

  async function approve(): Promise<void> {
    if (!generated) return;
    setMods(await saveModification(generatedToModification(generated, prompt)));
    setGenerated(null);
  }

  return (
    <main className="shell side">
      <Brand />
      <section className="panel stack">
        <div>
          <span className="pill">Current page context</span>
          <p className="muted">{context ? context.title : 'Click refresh if the page context is unavailable.'}</p>
        </div>
        {targetElement && (
          <div className="panel stack">
            <span className="pill">Targeted element</span>
            <p className="muted">
              <strong>{targetElement.selector}</strong>
            </p>
            <p className="tiny muted">{targetElement.text || targetElement.role}</p>
            <button className="ghost" onClick={clearTargetElement}>
              Clear element target
            </button>
          </div>
        )}
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setConsent(false);
          }}
          placeholder="Describe how this site should change..."
        />
        <label className="tiny muted">
          Context sent to AI provider
          <select
            value={contextMode}
            onChange={(e) => {
              setContextMode(e.target.value as ContextMode);
              setConsent(false);
            }}
            disabled={Boolean(targetElement)}
          >
            <option value="page">Current page summary</option>
            <option value="selected-text">Selected text only</option>
            <option value="minimal">Minimal: URL and title only</option>
          </select>
        </label>
        <div className="panel stack">
          <strong>Privacy preview</strong>
          <p className="tiny muted">{contextPreview}</p>
          <label className="tiny muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I approve sending this prompt and context to my
            configured AI provider.
          </label>
        </div>
        <div className="row">
          <button disabled={busy || !prompt.trim()} onClick={runGenerate}>
            {busy ? 'Generating…' : targetElement ? 'Generate for selected element' : 'Generate modification'}
          </button>
          <button className="secondary" disabled={picking} onClick={pickElement}>
            {picking ? 'Pick on page…' : 'Select element'}
          </button>
          <button
            className="secondary"
            onClick={() =>
              getPageContext().then((page) => {
                setContext(page);
                setConsent(false);
              })
            }
          >
            Refresh context
          </button>
        </div>
        {error && <p className="danger">{error}</p>}
      </section>
      {generated && (
        <section className="panel stack">
          <div className="row">
            <div>
              <h2>{generated.name}</h2>
              <p className="muted">{generated.description}</p>
            </div>
            <span className="pill">{generated.riskLevel}</span>
          </div>
          {generated.safetyFindings?.length ? (
            <div className="stack">
              <strong>Safety review</strong>
              {generated.safetyFindings.map((finding) => (
                <p className={finding.severity === 'info' ? 'tiny muted' : 'tiny danger'} key={`${finding.category}-${finding.message}`}>
                  {finding.severity.toUpperCase()}: {finding.category} — {finding.message}
                </p>
              ))}
            </div>
          ) : null}
          {generated.rollbackNotes && (
            <p className="muted">
              <strong>Rollback:</strong> {generated.rollbackNotes}
            </p>
          )}
          {generated.refinedPrompt && (
            <p className="muted">
              <strong>Refined intent:</strong> {generated.refinedPrompt}
            </p>
          )}
          {generated.implementationPlan?.length ? (
            <ol className="muted">
              {generated.implementationPlan.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          <p>{generated.explanation}</p>
          {generated.css && <pre className="code">{generated.css}</pre>}
          {generated.javascript && <pre className="code">{generated.javascript}</pre>}
          <button onClick={approve}>Approve & save</button>
        </section>
      )}
      <section className="panel">
        <h2>{websiteLabel(activeUrl)} modifications</h2>
        <p className="muted tiny">Showing only modifications matching the current website.</p>
        <ModificationList
          modifications={siteMods}
          onToggle={(id, en) => toggleModification(id, en).then(setMods)}
          onDelete={(id) => deleteModification(id).then(setMods)}
          onSave={(mod) => saveModification(mod).then(setMods)}
          onRegenerate={async (prompt) => {
            if (!consent) throw new Error('Confirm privacy consent in the side panel before regenerating.');
            const page = contextForMode(context ?? (await getPageContext()), contextMode, targetElement);
            setContext(page);
            return generate(prompt, page);
          }}
        />
      </section>
    </main>
  );
}

function contextForMode(page: PageContext, mode: ContextMode, targetElement: SelectedElement | null): PageContext {
  if (targetElement)
    return {
      ...page,
      targetElement,
      selectedText: '',
      visibleTextSample: '',
      headings: [],
      elementSummary: [{ selector: targetElement.selector, role: targetElement.role, text: targetElement.text }],
    };
  if (mode === 'selected-text') return { ...page, visibleTextSample: '', headings: [], elementSummary: [], selectedText: page.selectedText };
  if (mode === 'minimal') return { ...page, selectedText: '', visibleTextSample: '', headings: [], elementSummary: [] };
  return page;
}

function describeContext(page: PageContext | null, mode: ContextMode, targetElement: SelectedElement | null): string {
  if (!page) return 'No page context loaded yet.';
  if (targetElement)
    return `Prompt + URL/title + selected element only: ${targetElement.selector}. Element text preview: ${targetElement.text.slice(0, 160) || 'none'}.`;
  if (mode === 'selected-text')
    return `Prompt + URL/title + browser-selected text only (${page.selectedText.length} characters). No visible page text or element list.`;
  if (mode === 'minimal') return 'Prompt + page URL and title only. No selected text, visible page text, or element list.';
  return `Prompt + URL/title + headings (${page.headings.length}) + visible text sample (${page.visibleTextSample.length} characters) + element summaries (${page.elementSummary.length}).`;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SidePanel />
  </React.StrictMode>,
);
