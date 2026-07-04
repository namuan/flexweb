import { describe, expect, it } from 'vitest';
import manifest from '../../public/manifest.json';

describe('extension manifest', () => {
  it('uses Manifest V3 with expected entry points', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.action.default_popup).toBe('popup.html');
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');
  });

  it('declares the permissions required by current runtime features', () => {
    expect(manifest.permissions).toEqual(expect.arrayContaining(['activeTab', 'storage', 'sidePanel', 'scripting']));
  });
});
