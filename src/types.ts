//This file contains the TypeScript interfaces for the application

//AI Response
interface OtterResponse {
  whatHappened: string;
  nextSteps: string[];
  otterThoughts: string;
}

//Webview Messages
export interface renderAIResponse {
  type: "renderAI";
  payload: OtterResponse[];
}

//Ready to render the webview
export interface renderReady {
  type: "renderReady";
  payload: null;
}


export type WebviewMessage = renderAIResponse | renderReady;
