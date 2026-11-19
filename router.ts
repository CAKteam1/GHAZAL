import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { KeyVault, ProviderId } from '../security/vault.js';

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  providerOverride?: ProviderId;
  jsonMode?: boolean;
}

export interface LLMResponse {
  provider: ProviderId;
  model: string;
  text: string;
  latencyMs: number;
}

export class MultiProviderRouter {
  constructor(private vault: KeyVault) {}

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const config = this.vault.getActiveConfig();
    const provider = req.providerOverride || config.provider;
    const apiKey = config.apiKey;
    const model = config.model;

    if (!apiKey) {
      throw new Error(`No API key configured for active provider: ${provider.toUpperCase()}`);
    }

    const start = Date.now();
    let text = '';

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContent({
        model,
        contents: req.userPrompt,
        config: {
          systemInstruction: req.systemPrompt,
          responseMimeType: req.jsonMode ? 'application/json' : 'text/plain',
        },
      });
      text = res.text ?? '';
    } else if (provider === 'claude') {
      const anthropic = new Anthropic({ apiKey });
      const res = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        system: req.systemPrompt,
        messages: [{ role: 'user', content: req.userPrompt }],
      });
      const block = res.content.find((b) => b.type === 'text');
      text = block && 'text' in block ? block.text : '';
    } else if (provider === 'openai') {
      const openai = new OpenAI({ apiKey });
      const res = await openai.chat.completions.create({
        model,
        response_format: req.jsonMode ? { type: 'json_object' } : undefined,
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userPrompt },
        ],
      });
      text = res.choices[0]?.message?.content ?? '';
    }

    return {
      provider,
      model,
      text,
      latencyMs: Date.now() - start,
    };
  }
}
