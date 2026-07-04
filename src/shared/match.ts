export function patternForUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  return `${url.protocol}//${url.hostname}/*`;
}

export function matchesPattern(rawUrl: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(rawUrl);
}

export function anyPatternMatches(rawUrl: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPattern(rawUrl, pattern));
}
