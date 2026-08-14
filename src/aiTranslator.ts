// aiTranslator.ts — sends formatted error data to a VS Code language model and parses the response.
// Uses the VS Code Language Model API (vscode.lm), which routes requests through any installed
// chat extension (e.g. GitHub Copilot) — no direct API key or network access needed from our code.

import * as vscode from 'vscode';

// shape of one AI-translated result; mirrors the structure rendered in the diagnosis panel
export interface OtterResponse {
  whatHappened: string; // plain-English explanation of what went wrong
  nextSteps: string[]; // 2-3 actionable steps the user can take to fix the error
  otterThoughts: string; // a light ocean/otter-themed encouragement or pun
}

export async function otterTranslation(
  errors: string, // JSON-serialized ErrorFormat[] produced by errorListening.ts
  model: vscode.LanguageModelChat | undefined,
): Promise<OtterResponse[]> {
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

  try {
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

    // the model streams its response in chunks — accumulate the full text before parsing
    let fullText = '';
    for await (const chunk of response.text) {
      fullText += chunk;
    }

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
    } catch (jsonErr) {
      console.error('Invalid JSON from model:', fullText);
      throw new Error('Model returned invalid JSON');
    }

    return parsed;
  } catch (err) {
    console.error('Error Occurred with Translation:', err);

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
