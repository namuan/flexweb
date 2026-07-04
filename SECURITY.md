# Security Policy

FlexWeb is an early MVP Chrome extension that can execute user-approved website modifications.

## Reporting a Vulnerability

Please open a private security advisory on GitHub if available, or contact the repository maintainer directly. Do not include API keys, private page content, or credentials in reports.

## API Keys

FlexWeb stores Bring Your Own Key provider credentials locally in Chrome extension storage. Never commit API keys, `.env` files, browser profiles, or exported extension storage to this repository.

## Known MVP Limitations

- AI-generated JavaScript should be reviewed before approval.
- Generated modifications are local to the browser and are not sandbox-reviewed by a remote service.
- Browser-restricted pages such as `chrome://` URLs and the Chrome Web Store cannot be modified.
