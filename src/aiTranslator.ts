import * as vscode from 'vscode';

export interface OtterResponse{
  whatHappened: string;
  nextSteps:string[];
  otterThoughts: string;
}

export async function otterTranslation(
  error: string,
  model: vscode.LanguageModelChat,
): Promise<OtterResponse> {

  const systemPrompt = `You are an Otter AI, friendly programming assistant who specializes in compiler and runtime errors.

  You will recieve a JSON Object with this exact structure:
{
  "message": string,
  "code":  number ,
  "source": string,
  "fileSource": string ,
  "selectedText": string | null,
  "errorContext": string,
}

  RULES:
    - Use only the information in the JSON object.
    - Translate technical error messages into clear, plain English.
    - Only use the error context to better understand the provided diagnostic error.
    - Use a kind and encouraging tone.
    - Do NOT mention JSON, diagnostics, or internal tooling.
    - Include a light sea or ocean-themed pun (otter/ocean related) when appropriate.
    - Provide 2-3 actionable next steps the developer can try.
    - Do NOT be sarcastic.
    - Do NOT be overly verbose.
    - Do NOT invent solutions unrelated to the error.

    If the JSON cannot be parsed, respond with:
"OtterDr couldn't understand this error yet — please select a valid compiler error 🦦"

  OUTPUT FORMAT (follow exactly):
    Return ONLY valid JSON in this exact shape:

{
  "whatHappened": string,
  "nextSteps": string[],
  "otterThoughts": string
}

   IMPORTANT:
- Do NOT use Markdown symbols like **, #, -, or bullet characters.
- Return plain rendered text only.
- Do not wrap the response in code blocks.
- Do not add extra sections.
`;

  try {
    // VS Code's chat API only has User/Assistant roles, so the system
    // prompt is sent as a leading User message instead of a system role
    const messages = [
      vscode.LanguageModelChatMessage.User(systemPrompt.trim()),
      vscode.LanguageModelChatMessage.User(`Here is the error JSON to translate: ${error}`),
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
      // Extract the first {...} block in case there's leading/trailing prose
      const jsonMatch = stripped.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : stripped;
      parsed = JSON.parse(jsonText);
    } catch (jsonErr) {
      console.error('Invalid JSON from model:', fullText);
      throw new Error('Model returned invalid JSON');
    }

    return parsed;

  } catch (err) {
    console.error('Error Occurred with Translation:', err);

    return {
      whatHappened: 'OtterDr had trouble understanding this error clearly.',
      nextSteps: [
        'Try selecting the error again starting with the line with red squiggle.',
        'Make sure your internet connection is stable.',
      ],
      otterThoughts: 'This error is drifting 🌊',
    };
  }
}
