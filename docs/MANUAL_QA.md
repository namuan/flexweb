# Manual QA Checklist

Use this checklist before tagging or sharing a release candidate.

## Build and Load

- [ ] Run `npm run verify` successfully.
- [ ] Run `npm run build` and load `dist/` as an unpacked extension.
- [ ] Confirm popup, side panel, and options page open without console errors.

## Provider and Privacy

- [ ] Save OpenRouter/OpenAI-compatible provider settings.
- [ ] Generate once with page-summary context after checking the consent box.
- [ ] Generate once with selected-text-only context.
- [ ] Generate once with minimal context.
- [ ] Confirm generation is blocked until per-request consent is checked.

## Modification Lifecycle

- [ ] Generate a CSS modification and approve/save it.
- [ ] Confirm only current-site modifications appear in popup, side panel, and options.
- [ ] Disable, enable, edit, regenerate, and delete a modification.
- [ ] Confirm saved modifications reapply after page refresh.
- [ ] Confirm saved modifications reapply after SPA route changes where applicable.

## Element Picker

- [ ] Start element picker from the side panel.
- [ ] Confirm hover highlight follows the cursor.
- [ ] Select an element and confirm it remains highlighted.
- [ ] Generate a target-element modification and confirm CSS is scoped to the selected element.
- [ ] Clear the target element and confirm the persistent highlight is removed.

## Safety and Runtime

- [ ] Confirm risky generated JavaScript shows safety warnings before approval.
- [ ] Confirm blocker-level JavaScript is not executed.
- [ ] Confirm last-run status updates for applied and blocked/error modifications.
- [ ] Confirm Emergency disable all disables all modifications and removes CSS from the active page.

## Restricted Pages

- [ ] Try `chrome://extensions` and confirm FlexWeb reports a clear unsupported-page message.
- [ ] Try Chrome Web Store and confirm FlexWeb does not promise modification support.
