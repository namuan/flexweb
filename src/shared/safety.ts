import type { GeneratedModification, Modification, SafetyFinding } from './types';

const RISKY_PATTERNS: Array<{ pattern: RegExp; category: string; message: string; severity: SafetyFinding['severity'] }> = [
  { pattern: /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/, category: 'Network access', message: 'JavaScript appears to make network requests. Review for data exfiltration risk.', severity: 'blocker' },
  { pattern: /\b(localStorage|sessionStorage|indexedDB|cookie)\b|document\.cookie/, category: 'Storage or cookies', message: 'JavaScript accesses browser/page storage or cookies.', severity: 'blocker' },
  { pattern: /\b(password|credential|token|authorization|auth|secret|card|cc-number)\b/i, category: 'Sensitive data', message: 'JavaScript references words commonly associated with credentials or payment data.', severity: 'blocker' },
  { pattern: /\b(location\.(href|assign|replace)|window\.open|history\.(pushState|replaceState))\b/, category: 'Navigation', message: 'JavaScript may navigate or alter page history.', severity: 'warning' },
  { pattern: /(submit\(|requestSubmit\(|form\.submit)/, category: 'Form submission', message: 'JavaScript may submit forms.', severity: 'blocker' },
  { pattern: /\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/, category: 'HTML injection', message: 'JavaScript writes raw HTML, which can break page behavior or introduce injection risk.', severity: 'warning' },
  { pattern: /\b(eval\(|Function\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`])/, category: 'Dynamic code', message: 'JavaScript constructs code dynamically.', severity: 'blocker' },
  { pattern: /(remove\(|replaceWith\(|replaceChildren\(|appendChild\(|prepend\()/, category: 'DOM mutation', message: 'JavaScript mutates the DOM. Confirm it preserves page functionality.', severity: 'info' }
];

export function analyzeSafety(input: Pick<GeneratedModification | Modification, 'css' | 'javascript' | 'type'>): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const javascript = input.javascript ?? '';
  if (javascript) {
    for (const rule of RISKY_PATTERNS) {
      if (rule.pattern.test(javascript)) findings.push({ severity: rule.severity, category: rule.category, message: rule.message });
    }
  }
  if (input.css && /\*\s*\{|html\s*\{|body\s*\{|\[class\*=/.test(input.css)) {
    findings.push({ severity: 'info', category: 'Broad CSS selector', message: 'CSS includes broad selectors. Check that the scope is intentional.' });
  }
  if (!findings.length) findings.push({ severity: 'info', category: 'No obvious risks', message: 'No static safety issues were detected.' });
  return findings;
}

export function hasBlockers(findings: SafetyFinding[] = []): boolean {
  return findings.some((finding) => finding.severity === 'blocker');
}

export function riskFromFindings(findings: SafetyFinding[]): GeneratedModification['riskLevel'] {
  if (findings.some((finding) => finding.severity === 'blocker')) return 'high';
  if (findings.some((finding) => finding.severity === 'warning')) return 'medium';
  return 'low';
}
