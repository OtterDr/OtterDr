// types.ts — shared message type definitions for postMessage communication
// between the extension host and the sidebar webview.
// Keeping message shapes here (rather than inline in extension.ts or App.tsx) means
// both sides of the bridge can reference the same contract.

// mirrors OtterResponse in aiTranslator.ts — duplicated here so webview code can import
// the type without pulling in aiTranslator.ts, which depends on the 'vscode' module
// that does not exist in the browser (webview) context.
interface OtterResponse {
  whatHappened: string;
  nextSteps: string[];
  otterThoughts: string;
}

// sent from the extension host to the webview to render AI-translated error cards
export interface renderAIResponse {
  type: "renderAI";
  payload: OtterResponse[];
}

// sent from the webview to the extension host once the React app has mounted
// and registered its message listener — signals it is safe to postMessage state back
export interface renderReady {
  type: "renderReady";
  payload: null;
}

// discriminated union of all message types the webview can send to the extension host
export type WebviewMessage = renderAIResponse | renderReady;
