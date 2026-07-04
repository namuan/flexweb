import type { GenerateRequest, GeneratedModification, ProviderSettings } from './types';
import { patternForUrl } from './match';
import { analyzeSafety, riskFromFindings } from './safety';

export async function generateModification(settings: ProviderSettings, request: GenerateRequest): Promise<GeneratedModification> {
  if (!settings.apiKey.trim()) {
    throw new Error('Add an OpenRouter or OpenAI-compatible API key in Options before generating modifications.');
  }

  const refinedPrompt = refinePrompt(request.prompt);
  const system = `You generate browser extension website customizations based on HCI findings about LLM webpage editing.

Return only valid JSON matching this schema: {"name": string, "description": string, "matchPatterns": string[], "type": "css"|"javascript"|"hybrid", "css"?: string, "javascript"?: string, "explanation": string, "implementationPlan"?: string[], "refinedPrompt"?: string, "rollbackNotes"?: string, "riskLevel": "low"|"medium"|"high"}.

Rules:
1. Prefer CSS-only modifications. Use JavaScript only when CSS cannot accomplish the request.
2. Do not rewrite, replace, or recreate large HTML components. Preserve existing functionality.
3. Do not invent fake controls/components. Target existing selectors from pageContext.elementSummary where possible.
4. If pageContext.targetElement exists, apply the user's request only to that target element and its safe descendants. Scope CSS selectors to pageContext.targetElement.selector. Do not apply broad page-wide selectors in targeted mode.
5. Convert vague requests into concrete actions before coding. For example, "make it easier to read" means font-size, line-height, max-width, contrast, spacing, and clutter reduction.
6. Generate minimal, scoped, reversible code. Avoid broad destructive selectors unless the user explicitly asked for them.
7. JavaScript must be self-contained browser code and must not fetch, exfiltrate data, store credentials, submit forms, or navigate away.
8. For complex websites, prefer additive enhancement, hiding clutter, or styling stable semantic selectors over DOM reconstruction.`;
  const user = JSON.stringify({
    originalPrompt: request.prompt,
    refinedPrompt,
    pageContext: request.pageContext,
    suggestedPattern: patternForUrl(request.pageContext.url),
    instruction: request.pageContext.targetElement
      ? 'Implement the refined prompt only for pageContext.targetElement. Include implementationPlan explaining how the selected element is targeted. Include rollbackNotes explaining how to reverse/disable the change.'
      : 'Implement the refined prompt. Include implementationPlan explaining concrete actions. Include rollbackNotes explaining how to reverse/disable the change.'
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const endpoint = chatCompletionsEndpoint(settings.baseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
      'HTTP-Referer': 'https://flexweb.local',
      'X-Title': 'FlexWeb'
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const body = await response.text();
    const hint = response.status === 404
      ? ' Check the provider base URL. For OpenRouter use https://openrouter.ai/api/v1, not a model URL or a duplicated /chat/completions path.'
      : '';
    throw new Error(`AI provider returned ${response.status} from ${endpoint}: ${body}${hint}`);
  }
  const data = JSON.parse(await response.text()) as { choices?: Array<{ message?: { content?: string | object } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI provider returned an empty response.');
  return validateGenerated(typeof content === 'string' ? parseJsonObject(content) : content, request.pageContext.url);
}

function chatCompletionsEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://openrouter.ai/api/v1/chat/completions';
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  return `${trimmed}/chat/completions`;
}

function parseJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) return JSON.parse(fenced);
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first >= 0 && last > first) return JSON.parse(trimmed.slice(first, last + 1));
    throw new Error('AI provider returned text that was not valid JSON.');
  }
}

function validateGenerated(value: unknown, url: string): GeneratedModification {
  const candidate = value as Partial<GeneratedModification>;
  if (!candidate.name || !candidate.description || !candidate.type || !candidate.explanation) {
    throw new Error('Generated modification is missing required fields.');
  }
  if (!['css', 'javascript', 'hybrid'].includes(candidate.type)) throw new Error('Unsupported modification type.');
  if (!candidate.css && !candidate.javascript) throw new Error('Generated modification contains no CSS or JavaScript.');
  const generatedCandidate = {
    type: candidate.type,
    css: candidate.css,
    javascript: candidate.javascript
  };
  const findings = analyzeSafety(generatedCandidate);
  return {
    name: candidate.name,
    description: candidate.description,
    matchPatterns: candidate.matchPatterns?.length ? candidate.matchPatterns : [patternForUrl(url)],
    type: candidate.type,
    css: candidate.css,
    javascript: candidate.javascript,
    explanation: candidate.explanation,
    implementationPlan: candidate.implementationPlan,
    refinedPrompt: candidate.refinedPrompt,
    rollbackNotes: candidate.rollbackNotes ?? 'Disable or delete this modification in FlexWeb to remove the injected CSS/JavaScript.',
    safetyFindings: findings,
    riskLevel: riskFromFindings(findings) === 'low' ? (candidate.riskLevel ?? 'low') : riskFromFindings(findings)
  };
}

function refinePrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();
  const refinements: string[] = [];

  if (/easier to read|readable|reading|focus/.test(normalized)) {
    refinements.push('increase readable font sizes where appropriate', 'increase line-height for text blocks', 'limit long paragraphs to a comfortable max-width', 'improve foreground/background contrast', 'add comfortable spacing around article content');
  }
  if (/modern|clean|better design|prettier|nice/.test(normalized)) {
    refinements.push('simplify visual clutter', 'normalize spacing', 'soften harsh borders/backgrounds', 'improve typographic hierarchy without changing functionality');
  }
  if (/distract|clutter|annoying|hide/.test(normalized)) {
    refinements.push('hide clearly promotional, sticky, modal, cookie, newsletter, or sidebar clutter only when selectors indicate that purpose');
  }
  if (/accessible|accessibility|contrast|colorblind|colourblind/.test(normalized)) {
    refinements.push('improve contrast', 'avoid relying on red/green distinction', 'preserve images and controls unless explicitly requested');
  }

  if (!refinements.length) return prompt;
  return `${prompt}\n\nConcrete interpretation: ${refinements.join('; ')}.`;
}
