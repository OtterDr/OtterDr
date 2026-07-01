import * as vscode from 'vscode';

export interface OtterResponse {
  whatHappened: string;
  nextSteps: string[];
  otterThoughts: string;
}

export async function otterTranslation(
  errors: string,  // JSON array of ErrorFormat[]
  model: vscode.LanguageModelChat,
): Promise<OtterResponse[]> {

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
    // VS Code's chat API only has User/Assistant roles, so the system
    // prompt is sent as a leading User message instead of a system role
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt.trim()),
      vscode.LanguageModelChatMessage.User(`Here are the errors to translate: ${errors}`),
    ];

    const response = await model.sendRequest(messages, {});

    let fullText = '';
    for await (const chunk of response.text) {
      fullText += chunk;
    }

    let parsed: any;
    try {
      // Strip markdown code fences if the model wrapped the response
      const stripped = fullText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      // Extract the first [...] array block in case there's leading/trailing prose
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

    return [{
      whatHappened: 'OtterDr had trouble understanding these errors clearly.',
      nextSteps: [
        'Try selecting the errors again starting with the red squiggle lines.',
        'Make sure your internet connection is stable.',
      ],
      otterThoughts: 'These errors are drifting 🌊',
    }];
  }
}
