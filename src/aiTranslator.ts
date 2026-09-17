// aiTranslator.ts — sends formatted error data to a VS Code language model and parses the response.
// Uses the VS Code Language Model API (vscode.lm), which routes requests through any installed
// chat extension (e.g. GitHub Copilot) — no direct API key or network access needed from our code.

import * as vscode from 'vscode';
import { ModelConfig, getStoredApiKey } from './aiModelSelector2';

// shape of one AI-translated result; mirrors the structure rendered in the diagnosis panel
export interface OtterResponse {
  whatHappened: string; // plain-English explanation of what went wrong
  nextSteps: string[]; // 2-3 actionable steps the user can take to fix the error
  otterThoughts: string; // a light ocean/otter-themed encouragement or pun
}

// the system prompt defines the AI persona and the strict output contract.
// explicit rules (no markdown, exact JSON shape, same array order as input) make the
// response easier to parse reliably and safe to render directly into HTML.

const systemPrompt = `You are an Otter AI, friendly programming assistant who specializes in compiler and runtime errors.

You will receive a JSON Array of error objects, each with this exact structure:
{
"message": string,
"code": number,
"source": string,
"fileSource": string,
"selectedText": string | null,
"errorContext": string,
}

RULES:
  - Translate each error separately, in the same order as the input array.
  - Use only the information provided in each object.
  - Translate technical error messages into clear, plain English.
  - Only use the error context to better understand the diagnostic error.
  - Use a kind and encouraging tone.
  - Do NOT mention JSON, diagnostics, or internal tooling.
  - Include a light sea or ocean-themed pun (otter/ocean related) when appropriate.
  - Provide 2-3 actionable next steps per error.
  - Do NOT be sarcastic, overly verbose, or invent unrelated solutions.
  - The response array MUST have the same number of elements as the input, in the same order.

  If the input cannot be parsed, return a single-element array:
[{"whatHappened": "OtterDr couldn't understand these errors yet — please select valid compiler errors 🦦", "nextSteps": [], "otterThoughts": ""}]

OUTPUT FORMAT (follow exactly):
  Return ONLY a valid JSON array where each element matches:

[
{
  "whatHappened": string,
  "nextSteps": string[],
  "otterThoughts": string
}
]

IMPORTANT:
- No Markdown symbols (**, #, -, bullets).
- Plain text only — no code blocks, no extra sections.
`;

function extractAndParseJson(fullText: string): OtterResponse[] {
  let parsed: any;
  try {
    // some models wrap their JSON output in ```json ... ``` fences — strip those first
    const stripped = fullText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    // extract just the [...] array block in case the model added explanatory prose around it
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : stripped;
    parsed = JSON.parse(jsonText);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (jsonErr) {
    console.error('Invalid JSON from model:', fullText);
    // always return a valid OtterResponse[] so the diagnosis panel renders something
    // useful even when the AI call fails, rather than crashing or showing a blank panel
    return [
      {
        whatHappened: 'OtterDr had trouble understanding these errors clearly.',
        nextSteps: [
          'Try selecting the errors again starting with the red squiggle lines.',
          'Make sure your internet connection is stable.',
        ],
        otterThoughts: 'These errors are drifting 🌊',
      },
    ];
  }
}

//Differet functions to parse and send prompts to the relevant AI models.

/**
 * 1. VS Code Native Model Execution (Copilot)
 */
async function executeCopilot(
  errors: string,
  model: vscode.LanguageModelChat,
): Promise<OtterResponse[]> {
  // VS Code's Language Model API only supports User and Assistant roles — no system role.
  // The system prompt is sent as the first User message so the model treats it as instructions
  // before seeing the actual error data in the second message.
  const messages = [
    vscode.LanguageModelChatMessage.User(systemPrompt.trim()),
    vscode.LanguageModelChatMessage.User(
      `Here are the errors to translate: ${errors}`,
    ),
  ];

  const response = await model.sendRequest(messages, {});

  let fullText = '';
  for await (const chunk of response.text) {
    fullText += chunk;
  }

  return extractAndParseJson(fullText);
}

/**
 * 2. OpenAI Direct API Execution
 */
async function executeOpenAI(
  errors: string,
  modelId: string,
  apiKey: string,
): Promise<OtterResponse[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt.trim() },
        {
          role: 'user',
          content: `Here are the errors to translate: ${errors}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const rawText = data.choices[0]?.message?.content ?? '[]';
  return extractAndParseJson(rawText);
}

/**
 * 3. Anthropic Direct API Execution
 */
async function executeAnthropic(
  errors: string,
  modelId: string,
  apiKey: string,
): Promise<OtterResponse[]> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt.trim(),
      messages: [
        {
          role: 'user',
          content: `Here are the errors to translate: ${errors}\n\nReturn ONLY the JSON array:`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Anthropic request failed (${response.status}): ${errText}`,
    );
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = data.content.find((c) => c.type === 'text');
  const rawText = textBlock?.text ?? '[]';

  return extractAndParseJson(rawText);
}

export async function otterTranslation(
  errors: string, // JSON-serialized ErrorFormat[] produced by errorListening.ts
  config: ModelConfig | undefined,
  context: vscode.ExtensionContext,
): Promise<OtterResponse[]> {
  try {
    if (!config) {
      throw new Error('No AI model configuration provided.');
    }
    // Branch 1: Copilot / vscode.lm
    if (config.provider === 'copilot') {
      if (!config.vscodeModel) {
        throw new Error('Copilot language model instance is missing.');
      }
      return await executeCopilot(errors, config.vscodeModel);
    }

    // Branch 2 & 3: Bring Your Own API Key providers
    const apiKey = await getStoredApiKey(context, config.provider);
    if (!apiKey) {
      throw new Error(
        `API key for ${config.provider} not found in secret storage.`,
      );
    }

    if (config.provider === 'openai') {
      return await executeOpenAI(errors, config.modelId, apiKey);
    }

    if (config.provider === 'anthropic') {
      return await executeAnthropic(errors, config.modelId, apiKey);
    }

    throw new Error(`Unsupported model provider: ${config.provider}`);
  } catch (err) {
    console.error('Error Occurred with Translation:', err);
    // Default fallback so panel always gets a valid OtterResponse[]
    return [
      {
        whatHappened: 'OtterDr had trouble understanding these errors clearly.',
        nextSteps: [
          'Try selecting the errors again starting with the red squiggle lines.',
          'Make sure your internet connection is stable and your API key or model is active.',
        ],
        otterThoughts: 'These errors are drifting 🌊',
      },
    ];
  }
}
