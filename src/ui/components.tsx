import type { ReactElement } from 'react';
import { useState } from 'react';
import type { GeneratedModification, Modification } from '../shared/types';

export function Brand(): ReactElement {
  return (
    <div className="brand">
      <div className="mark">Fx</div>
      <div>
        <h1>FlexWeb</h1>
        <p>Shape the web to your intent.</p>
      </div>
    </div>
  );
}

interface ModificationListProps {
  modifications: Modification[];
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onSave: (modification: Modification) => void;
  onRegenerate: (prompt: string) => Promise<GeneratedModification>;
}

export function ModificationList({ modifications, onToggle, onDelete, onSave, onRegenerate }: ModificationListProps): ReactElement {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Modification | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState('');

  function startEdit(modification: Modification): void {
    setEditingId(modification.id);
    setDraft({ ...modification, matchPatterns: [...modification.matchPatterns] });
    setRegenerateError('');
  }

  function saveDraft(): void {
    if (!draft) return;
    onSave({ ...draft, updatedAt: new Date().toISOString(), matchPatterns: draft.matchPatterns.filter(Boolean) });
    setEditingId(null);
    setDraft(null);
  }

  async function regenerateDraft(): Promise<void> {
    if (!draft?.sourcePrompt.trim()) return;
    setRegenerating(true);
    setRegenerateError('');
    try {
      const generated = await onRegenerate(draft.sourcePrompt);
      setDraft({
        ...draft,
        name: generated.name,
        description: generated.description,
        matchPatterns: generated.matchPatterns,
        type: generated.type,
        css: generated.css,
        javascript: generated.javascript,
        safetyStatus: 'user-reviewed',
        safetyFindings: generated.safetyFindings,
        rollbackNotes: generated.rollbackNotes,
      });
    } catch (error) {
      setRegenerateError(error instanceof Error ? error.message : String(error));
    } finally {
      setRegenerating(false);
    }
  }

  if (!modifications.length) return <p className="muted">No modifications yet. Generate one from the side panel or install a built-in starter.</p>;
  return (
    <div className="stack">
      {modifications.map((mod) => {
        const isEditing = editingId === mod.id && draft;
        if (isEditing)
          return (
            <article className="mod stack" key={mod.id}>
              <div className="row">
                <h3>Edit modification</h3>
                <span className="pill">{draft.type}</span>
              </div>
              <label className="tiny muted">
                Original prompt
                <textarea value={draft.sourcePrompt} onChange={(event) => setDraft({ ...draft, sourcePrompt: event.target.value })} />
              </label>
              <div className="row">
                <button className="secondary" disabled={regenerating || !draft.sourcePrompt.trim()} onClick={regenerateDraft}>
                  {regenerating ? 'Regenerating…' : 'Regenerate code from prompt'}
                </button>
              </div>
              {regenerateError && <p className="danger">{regenerateError}</p>}
              <label className="tiny muted">
                Name
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </label>
              <label className="tiny muted">
                Description
                <input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </label>
              <label className="tiny muted">
                Match patterns, one per line
                <textarea
                  value={draft.matchPatterns.join('\n')}
                  onChange={(event) => setDraft({ ...draft, matchPatterns: event.target.value.split('\n').map((line) => line.trim()) })}
                />
              </label>
              <label className="tiny muted">
                CSS
                <textarea className="code-input" value={draft.css ?? ''} onChange={(event) => setDraft({ ...draft, css: event.target.value || undefined })} />
              </label>
              <label className="tiny muted">
                JavaScript
                <textarea
                  className="code-input"
                  value={draft.javascript ?? ''}
                  onChange={(event) => setDraft({ ...draft, javascript: event.target.value || undefined })}
                />
              </label>
              <div className="row">
                <button onClick={saveDraft}>Save changes</button>
                <button
                  className="secondary"
                  onClick={() => {
                    setEditingId(null);
                    setDraft(null);
                    setRegenerateError('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </article>
          );
        return (
          <article className="mod" key={mod.id}>
            <div className="row">
              <div>
                <h3>{mod.name}</h3>
                <p className="muted">{mod.description}</p>
              </div>
              <span className="pill">{mod.type}</span>
            </div>
            <p className="tiny muted">{mod.matchPatterns.join(', ')}</p>
            {mod.lastRun && (
              <p className={`tiny ${mod.lastRun.status === 'error' ? 'danger' : 'muted'}`}>
                Last run: {mod.lastRun.status}
                {mod.lastRun.message ? ` — ${mod.lastRun.message}` : ''}
              </p>
            )}
            {mod.safetyFindings?.length ? (
              <div className="stack">
                {mod.safetyFindings
                  .filter((finding) => finding.severity !== 'info')
                  .map((finding) => (
                    <p className="tiny danger" key={`${finding.category}-${finding.message}`}>
                      Safety: {finding.category} — {finding.message}
                    </p>
                  ))}
              </div>
            ) : null}
            <div className="row">
              <button className="secondary" onClick={() => onToggle(mod.id, !mod.enabled)}>
                {mod.enabled ? 'Disable' : 'Enable'}
              </button>
              <button className="ghost" onClick={() => startEdit(mod)}>
                Edit
              </button>
              <button className="ghost danger" onClick={() => onDelete(mod.id)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
