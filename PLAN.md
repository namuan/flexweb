# FlexWeb Implementation Plan

This plan describes how to implement the product described in `PRODUCT.md`: an AI-powered Chrome extension that lets users customize, fix, and enhance websites using natural language prompts, with persistent modifications, a ready-made modification library, an AI sidebar, and privacy-focused BYOK support.

## Assumptions

- The first target platform is a Chromium-based browser extension using Manifest V3.
- The initial application can be built as a new project because the repository currently only contains product documentation.
- The first release should prioritize safe, persistent webpage modifications over full community sharing or monetization.
- AI calls should support Bring Your Own Key first, with hosted credits/payment support added later.

## Open Questions

- Which AI providers should be supported in v1: OpenAI only, Anthropic only, multiple providers, or a local model option?
  OpenAI API Standards based Providers. I want to setup OpenRouter
- Should generated modifications run as JavaScript, CSS, declarative rules, or a combination?
  Whatever is most effective
- Should users be allowed to install community modifications immediately, or should the first version only include built-in templates?
  No community support in MVP
- What review/sandboxing policy is required before executing AI-generated code on webpages?
  Not required in MVP
- Should account sync be required, optional, or deferred until after MVP?
  Not required in MVP

## Recommended MVP Scope

The MVP should prove the core loop:

1. User opens FlexWeb on a webpage.
2. User describes a desired change in natural language.
3. AI converts the request into a safe site-specific modification.
4. FlexWeb previews/applies the modification on the current page.
5. The modification persists and re-runs on future visits to matching pages.
6. User can disable, edit, or delete the modification.

Defer the public community library, extension exporter, billing, and advanced web search until the core customization workflow is stable.

## Architecture Overview

### Browser Extension Layers

- **Popup UI**: Quick entry point for prompting, enabling/disabling modifications, and opening the sidebar/dashboard.
- **Side Panel UI**: Main AI chat and website customization workspace.
- **Content Script**: Runs on webpages, inspects DOM, applies CSS/JS modifications, and reports page context back to the extension.
- **Background Service Worker**: Coordinates messages, stores user settings, calls AI providers, and manages installed modifications.
- **Options/Dashboard Page**: Manages API keys, privacy settings, installed modifications, library items, and export tools.

### Data Model

- **Modification**
  - `id`
  - `name`
  - `description`
  - `matchPatterns`
  - `type`: CSS, JavaScript, DOM automation, or hybrid
  - `sourcePrompt`
  - `generatedCode`
  - `enabled`
  - `createdAt`
  - `updatedAt`
  - `permissionsRequired`
  - `safetyStatus`

- **Library Item**
  - `id`
  - `title`
  - `category`
  - `description`
  - `supportedSites`
  - `modificationTemplate`
  - `author`
  - `trustLevel`

- **AI Provider Settings**
  - `provider`
  - `apiKeyStorageReference`
  - `model`
  - `dailyCreditUsage`
  - `privacyMode`

## Prioritized Remaining Work

The remaining work should be tackled in this order. UX polish and developer/project quality tasks are intentionally lower priority than MVP safety, privacy, runtime reliability, and core product capability.

### Priority 1: Safety and Runtime Reliability

- [x] Add static safety checks before JavaScript execution.
- [x] Highlight requested permissions and risky behaviors.
- [x] Block or warn on network exfiltration, credential access, destructive DOM actions, and broad page access.
- [x] Track modification execution results and errors in the UI/storage model.
- [x] Add emergency disable-all control.
- [x] Add rollback notes to structured AI output.

### Priority 2: Privacy and Context Control

- [ ] Add explicit per-request context consent UI before provider calls.
- [ ] Add controls for selected-text-only context and no-context prompting.
- [ ] Add in-product per-request privacy details before generation.
- [ ] Add privacy indicators showing exactly what context is sent.

### Priority 3: Core Product Expansion

- [ ] Add general chat UI in the side panel.
- [ ] Support page-aware questions using approved page context.
- [ ] Support selected-text actions such as summarize, rewrite, translate, and explain.
- [ ] Add input-field writing improvement flow.
- [ ] Improve built-in library coverage with Writing helpers and Fun/novelty categories.
- [ ] Add parameterized templates for common requests.

### Priority 4: Platform and Launch Readiness

- [ ] Add packaged extension/zip build command.
- [ ] Revisit manifest permissions for least-privilege host access before store submission.
- [ ] Detect PDF viewer pages and define supported PDF behavior.
- [ ] Create onboarding flow explaining permissions, privacy, and BYOK setup.
- [ ] Prepare Chrome Web Store listing assets.
- [ ] Review Chrome Web Store policy compliance.

### Priority 5: Lower-Priority UX Polish

- [ ] Add search and filter actions for modifications.
- [ ] Add duplicate and export actions for modifications.
- [ ] Add true diff preview against previous versions.
- [ ] Add version history or restore previous generated versions.
- [ ] Add dedicated per-site management view from popup or side panel.
- [ ] Add library search and category browsing.

### Priority 6: Developer and Project Quality

- [ ] Add linting and formatting.
- [ ] Add unit tests for storage, matching, provider adapters, and output validation.
- [ ] Add integration tests for extension message passing.
- [ ] Add browser automation tests for applying modifications on sample pages.
- [ ] Add manual QA checklist for generated modification safety.
- [ ] Create release checklist and versioning process.

## Task List

### Phase 1: Project Foundation

- [x] Choose the frontend and extension stack.
  - Recommended: TypeScript, React, Vite, Manifest V3, browser extension build tooling.
- [x] Initialize the extension project structure.
- [x] Add type checking.
- [ ] Add linting, formatting, and test tooling.
- [x] Create development and production build commands.
- [ ] Add packaged extension/zip build command.
- [x] Define extension manifest permissions.
- [ ] Revisit manifest permissions for least-privilege host access before store submission.
- [x] Set up local loading instructions for Chrome/Chromium.
- [x] Add GitHub publishing hygiene files and CI build workflow.

### Phase 2: Core Extension Shell

- [x] Implement the background service worker.
- [x] Implement content script injection on supported pages.
- [x] Implement fallback content-script injection when an existing tab has no receiver.
- [x] Implement popup UI with basic controls.
- [x] Implement side panel UI for the main AI/customization workflow.
- [x] Implement options/dashboard page for settings and modification management.
- [x] Add message passing between popup, side panel, content scripts, and background worker.
- [x] Add persistent local storage abstraction for settings and modifications.

### Phase 3: Page Context Collection

- [x] Build a page analyzer in the content script.
- [x] Collect safe page metadata: URL, title, selected text, visible headings, visible text sample, and simplified element summaries.
- [x] Avoid collecting sensitive fields by default, including passwords, payment fields, tokens, and private form values.
- [x] Add DevTools-style element picker for deliberate target-element selection.
- [x] Send page context only as part of a user-initiated generation/regeneration action.
- [ ] Add explicit per-request context consent UI before provider calls.
- [ ] Add controls for selected-text-only context and no-context prompting.
- [x] Define basic page context size limits and summarization rules.

### Phase 4: AI Prompt-to-Modification Pipeline

- [x] Define the AI instruction format for generating website modifications.
- [x] Require structured AI output containing explanation, match rules, code, implementation plan, refined prompt, and risk level.
- [x] Add rollback notes to structured AI output.
- [x] Support CSS-first modifications for safer changes.
- [x] Add JavaScript/DOM automation support.
- [x] Add static safety checks before JavaScript execution.
- [x] Implement OpenAI-compatible provider adapter for AI calls.
- [x] Implement BYOK provider configuration for OpenRouter/OpenAI-compatible APIs.
- [x] Add request/response validation before accepting AI output.
- [x] Add robust parsing and graceful handling for failed generations, malformed output, provider errors, and timeouts.
- [x] Add vague prompt refinement based on findings from `RESOURCE_1.md`.
- [x] Scope generation to a selected target element when the user deliberately picks one.

### Phase 5: Modification Runtime

- [x] Define how modifications match websites and URLs.
- [x] Apply CSS modifications through injected style elements.
- [x] Apply JavaScript modifications in the page main world so behavior matches DevTools Console more closely.
- [ ] Add constrained/sandboxed runtime wrapper for JavaScript modifications.
- [x] Track modification execution results and errors in the UI/storage model.
- [x] Add enable/disable controls per modification.
- [ ] Add undo/rollback support for the current session.
- [x] Re-apply enabled modifications automatically on page load and route changes in single-page apps.
- [ ] Add conflict handling when multiple modifications affect the same page.

### Phase 6: Safety and Trust Controls

- [x] Create a review/approval step before saving generated modifications.
- [x] Highlight requested permissions and risky behaviors.
- [x] Block or warn on network exfiltration, credential access, destructive DOM actions, and broad page access.
- [x] Prefer declarative CSS and narrowly scoped selectors where possible through prompting and target-element mode.
- [x] Add a user-visible generated code preview before approval.
- [ ] Add a true diff preview against previous versions.
- [x] Store generated code locally by default.
- [x] Add emergency disable-all control.
- [ ] Add import/export format with warning labels for untrusted modifications.

### Phase 7: Modification Management UI (Lower-Priority UX Polish)

- [x] Build installed modifications list.
- [x] Add enable, disable, edit, regenerate, and delete actions.
- [ ] Add search and filter actions.
- [ ] Add duplicate and export actions.
- [x] Show each modification's target sites.
- [ ] Show each modification's last run status.
- [x] Add manual editing for advanced users.
- [ ] Add version history or restore previous generated versions.
- [ ] Add dedicated per-site management view from popup or side panel.

### Phase 8: Built-in Library

- [x] Define built-in modification template format.
- [x] Add initial starter library categories:
  - Productivity
  - Distraction blockers
  - Reading and accessibility
  - Design tweaks
- [ ] Add remaining starter categories: Writing helpers and Fun/novelty.
- [x] Implement install flow for built-in modifications.
- [ ] Add parameterized templates for common requests, such as hiding elements or changing styles.
- [ ] Add library search and category browsing.
- [x] Defer public community publishing until moderation and trust systems are designed.

### Phase 9: AI Sidebar Assistant

- [ ] Add general chat UI in the side panel.
- [ ] Support page-aware questions using approved page context.
- [ ] Support selected-text actions such as summarize, rewrite, translate, and explain.
- [ ] Add input-field writing improvement flow.
- [ ] Let users insert AI-generated text back into focused inputs with confirmation.
- [ ] Add privacy indicators showing exactly what context is sent.
- [x] Defer full web search until core chat and page context are stable.

### Phase 10: PDFs and Non-Standard Pages

- [x] Detect and report unsupported browser-restricted pages.
- [ ] Detect PDF viewer pages.
- [ ] Define which customization features work on PDFs.
- [ ] Support sidebar chat over PDF text where accessible.
- [x] Add clear unsupported-page messages for Chrome Web Store, internal browser pages, and restricted origins.
- [x] Avoid promising modification support where extension APIs cannot operate.

### Phase 11: Extension Exporter

- [ ] Define export use cases: single modification, site pack, or standalone Chrome extension.
- [ ] Generate a minimal Manifest V3 extension from selected modifications.
- [ ] Include required manifest permissions and content scripts.
- [ ] Add download as zip.
- [ ] Add warnings about reviewing exported code before distribution.
- [ ] Defer publishing automation to later versions.

### Phase 12: Privacy, Settings, and Monetization Readiness

- [x] Implement BYOK API key setup and local Chrome extension storage strategy.
- [x] Add no-history-by-default behavior for chats and page context.
- [ ] Add optional local chat history setting.
- [x] Add basic privacy copy for API keys and provider requests in README/options/security docs.
- [ ] Add in-product per-request privacy details before generation.
- [ ] Add usage tracking for free daily credits if hosted AI is introduced.
- [x] Design account, subscription, and billing integration only after MVP validation.

### Phase 13: Testing and Quality Assurance (Later Developer/Project Quality)

- [ ] Add unit tests for storage, matching, provider adapters, and output validation.
- [ ] Add integration tests for extension message passing.
- [ ] Add browser automation tests for applying modifications on sample pages.
- [ ] Test common SPA sites for route-change reapplication.
- [ ] Test restricted pages and permission edge cases.
- [ ] Add manual QA checklist for generated modification safety.
- [ ] Test install, update, disable, delete, import, and export flows.
- [x] Add CI build verification with GitHub Actions.
- [x] Verify current build locally with `npm run build`.

### Phase 14: Launch Preparation

- [ ] Create onboarding flow explaining permissions, privacy, and BYOK setup.
- [x] Add example prompts and starter templates.
- [x] Add initial documentation for users and developers in `README.md`.
- [x] Add `LICENSE` and `SECURITY.md`.
- [ ] Prepare Chrome Web Store listing assets.
- [ ] Review Chrome Web Store policy compliance.
- [ ] Add error reporting strategy that does not collect page content by default.
- [ ] Create release checklist and versioning process.

## Suggested Milestones

### Milestone 1: Local Prototype

- Extension loads locally.
- Side panel accepts a prompt.
- A hardcoded CSS modification can be applied and persisted for one site.

### Milestone 2: AI-Generated CSS Modifications

- BYOK AI provider works.
- AI returns validated structured output.
- CSS modifications can be generated, previewed, saved, disabled, and deleted.

### Milestone 3: Safe JavaScript Modifications

- JavaScript modifications run through safety checks.
- Users see risk warnings before applying changes.
- Modifications re-run reliably on modern dynamic websites.

### Milestone 4: Library and Sidebar

- Built-in library supports one-click install.
- AI sidebar can answer questions about the current page with explicit context approval.
- Writing assistant can improve selected text or focused input content.

### Milestone 5: Beta-Ready Extension

- Core workflows are tested.
- Privacy settings are complete.
- Onboarding and documentation are ready.
- Extension package is ready for private beta distribution.

## Risks and Mitigations

- **Risk: AI-generated code may be unsafe.**
  - Mitigation: Prefer CSS first, validate structured output, block dangerous APIs, and require user confirmation.
- **Risk: Website layouts change often.**
  - Mitigation: Generate resilient selectors, support regeneration, and show failure states.
- **Risk: Extension permissions may feel invasive.**
  - Mitigation: Use narrow permissions, explain why they are needed, and request host access intentionally.
- **Risk: Page context may contain sensitive data.**
  - Mitigation: Redact sensitive fields, require approval, and default to no history.
- **Risk: Dynamic websites may override modifications.**
  - Mitigation: Use mutation observers, route-change detection, and scoped reapplication.

## Definition of Done for MVP

- Users can create a website modification from a natural language prompt.
- Users can preview, approve, save, disable, edit, and delete modifications.
- Saved modifications persist and run automatically on matching websites.
- BYOK AI provider setup works.
- Page context is only sent with user awareness and appropriate safeguards.
- The extension includes a basic management UI and a small built-in modification library.
- Core functionality is tested on representative static and dynamic websites.
