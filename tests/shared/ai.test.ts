import { describe, expect, it } from 'vitest';
import { chatCompletionsEndpoint, parseJsonObject } from '../../src/shared/ai';

describe('AI provider helpers', () => {
  it('normalizes OpenAI-compatible base URLs', () => {
    expect(chatCompletionsEndpoint('https://openrouter.ai/api/v1')).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(chatCompletionsEndpoint('https://openrouter.ai/api/v1/chat/completions')).toBe('https://openrouter.ai/api/v1/chat/completions');
  });

  it('extracts JSON from fenced provider output', () => {
    expect(parseJsonObject('```json\n{"ok":true}\n```')).toEqual({ ok: true });
  });

  it('extracts JSON from surrounding provider text', () => {
    expect(parseJsonObject('Here is the result: {"name":"Demo"} Thanks')).toEqual({ name: 'Demo' });
  });
});
