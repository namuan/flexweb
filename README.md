# FlexWeb

FlexWeb is an AI-powered Chrome extension MVP for customizing websites with natural language prompts. It can generate CSS/JavaScript modifications through an OpenAI-compatible API provider such as OpenRouter, save them locally, and re-apply them on matching pages.

> Status: MVP / experimental. Review generated modifications before approving them.

## Features in this MVP

- Manifest V3 Chrome extension
- React + TypeScript UI for popup, side panel, and options page
- OpenAI-compatible BYOK provider settings, defaulting to OpenRouter
- Page context collection from the active tab
- AI prompt-to-modification generation with structured JSON validation
- Persistent local modifications with enable/disable/delete controls
- Edit and regenerate existing modifications from their original prompt
- Optional DevTools-style element picker for targeting one specific page element
- CSS, JavaScript, and hybrid modification runtime
- Built-in starter modification library

## Requirements

- Node.js 20+
- npm
- Chrome or another Chromium-based browser with extension developer mode

## Install dependencies

```bash
npm install
```

## Build

```bash
npm run build
```

The compiled extension is written to `dist/`.

`dist/` is intentionally ignored by git. Build it locally before loading the extension.

## Load in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `dist/` directory.

## Configure OpenRouter

1. Open the FlexWeb extension options page.
2. Use base URL: `https://openrouter.ai/api/v1`.
3. Enter your OpenRouter API key.
4. Choose an OpenAI-compatible model, for example `openai/gpt-4o-mini`.
5. Save settings.

## Development

```bash
npm run dev
```

For extension testing, use `npm run build` and reload the unpacked extension from `chrome://extensions` after changes.

## Typecheck

```bash
npm run typecheck
```

## Repository hygiene

- Do not commit `node_modules/`, `dist/`, `.env` files, API keys, browser profiles, or exported local extension storage.
- Use `npm ci` in CI and clean checkouts.
- GitHub Actions runs `npm ci` and `npm run build` on pushes and pull requests to `main`.

## Important MVP Notes

- Generated JavaScript runs after user approval in the page's main world via `chrome.scripting.executeScript` so behavior is closer to code pasted into DevTools Console.
- API keys and modifications are stored locally with `chrome.storage.local`.
- Community modification sharing, account sync, billing, and extension export are intentionally deferred.
- Some browser-restricted pages, such as `chrome://` URLs and the Chrome Web Store, cannot be modified by extensions.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting guidance, API key handling notes, and current MVP security limitations.

## License

FlexWeb is licensed under the [MIT License](./LICENSE).
