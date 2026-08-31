// diagnosisPanel.ts — manages the OtterDr Diagnosis editor panel.
// Owns the per-error response cache, the AI call lifecycle, and the panel HTML renderer.
// Exported as a single function so extension.ts only needs to call openDiagnosisPanel()
// and pass a callback for awarding XP — no game logic lives here.

import * as vscode from 'vscode';
import { encode } from 'html-entities';
import { errorSelection, ErrorFormat } from './errorListening';
import { otterTranslation, OtterResponse } from './aiTranslator';
import { getNonce } from './utils';
import { resolveLanguageModel } from './aiModelSelector';

// module-level state — one diagnosis panel at a time, with its own cache and in-flight guard
let currentPanel: vscode.WebviewPanel | undefined;
let aiInProgress = false;

// cache keyed per individual error so any previously seen error is served immediately,
// regardless of which other errors are selected alongside it in the same batch
let cachedTranslations: Record<string, OtterResponse> = {};

//Keep tracks of the ai responses that will be sent in postMessages to render
let pendingResults: OtterResponse[] | null = null;

// stable cache key: excludes selectedText (varies with highlight length) but includes
// errorContext so the cache busts naturally when the surrounding code changes
function getErrorKey(error: ErrorFormat): string {
  return `${error.fileSource}::${error.code}::${error.message}::${error.errorContext}`;
}

// returns the existing panel (revealing it if hidden) or creates a new one
function getOrCreatePanel(
  context: vscode.ExtensionContext,
): vscode.WebviewPanel {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Two);
  } else {
    currentPanel = vscode.window.createWebviewPanel(
      'webview-id',
      'OtterDr Diagnosis 🦦',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [context.extensionUri],
      },
    );

    currentPanel.webview.html = renderHTML(
      currentPanel.webview,
      context.extensionUri,
    );

    currentPanel.webview.onDidReceiveMessage((message) => {
      if (message.type === 'AI_RENDER_READY') {
        if (aiInProgress) {
          currentPanel?.webview.postMessage({ type: 'LOADING_CONTENT' });
        } else if (pendingResults) {
          currentPanel?.webview.postMessage({
            type: 'AI_RESPONSE_UPDATE',
            payload: pendingResults,
          });
        }
      }
    });
    // clear the reference when the user closes the panel so a fresh one is created next time
    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      null,
      context.subscriptions,
    );
  }
  return currentPanel;
}

// renders one diagnosis card per AI response; adds numbered headings for multi-error batches
function renderHTML(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const nonce = getNonce();

  //Converting the React Panel for Ai Responses into a Js file to attached it to the html
  const aiScript = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'panel.bundle.js'),
  );

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
      <style>
        .error-card { margin-bottom: 1rem; }
        hr { border: none; border-top: 1px solid #444; margin: 1.5rem 0; }
      </style>
    </head>
    <body>
      <div id='root'></div>
      <script nonce="${nonce}">window.tsvscode = acquireVsCodeApi();</script>
      <script nonce="${nonce}" src="${aiScript}"></script>
    </body>
    </html>`;
}

// called by the otterDr.openWebview command in extension.ts.
// onDiagnosed is a callback that awards XP for the number of errors that required a real AI call.
export async function openDiagnosisPanel(
  context: vscode.ExtensionContext,
  onDiagnosed: (count: number) => Promise<void>,
): Promise<void> {
  // prevent overlapping AI calls — the otter can only dive once at a time
  if (aiInProgress) {
    vscode.window.showInformationMessage(
      'OtterDr is already fishing for a solution. 🦦',
    );
    return;
  }

  try {
    aiInProgress = true;

    const errorSelectionResult = errorSelection();
    if (!errorSelectionResult) {
      console.log('No error was selected');
      return;
    }

    const errors: ErrorFormat[] = JSON.parse(errorSelectionResult);
    // pre-size results so cached and fresh responses can be merged back by original index
    const results: OtterResponse[] = new Array(errors.length);
    const uncachedErrors: ErrorFormat[] = [];
    const uncachedIndices: number[] = [];

    // split errors into cached vs uncached — cached ones are served without an AI call
    errors.forEach((error, i) => {
      const key = getErrorKey(error);
      if (cachedTranslations[key]) {
        results[i] = cachedTranslations[key];
      } else {
        uncachedErrors.push(error);
        uncachedIndices.push(i);
      }
    });

    if (uncachedErrors.length === 0) {
      // every error was already cached — open the panel immediately with no AI call
      console.log('Using Cached Translation');
      const panel = getOrCreatePanel(context);
      pendingResults = results;
      panel.webview.postMessage({
        type: 'AI_RESPONSE_UPDATE',
        payload: pendingResults,
      });
      return;
    }

    // show a progress notification while the AI call is in flight
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'OtterDr is now diving into your code...🤿🪸',
        cancellable: false,
      },
      async () => {
        const panel = getOrCreatePanel(context);
        panel.webview.postMessage({ type: 'LOADING_CONTENT' });

        //CHANGING MODEL 2
        const model: vscode.LanguageModelChat | undefined =
          await resolveLanguageModel(context);
        // only send the uncached errors to the AI
        const aiResponses = await otterTranslation(
          JSON.stringify(uncachedErrors),
          model,
        );

        // cache each new response and slot it back into the correct position
        uncachedIndices.forEach((originalIdx, responseIdx) => {
          const key = getErrorKey(errors[originalIdx]);
          cachedTranslations[key] = aiResponses[responseIdx];
          results[originalIdx] = aiResponses[responseIdx];
        });

        // render only after all responses are ready

        pendingResults = results;
        panel.webview.postMessage({
          type: 'AI_RESPONSE_UPDATE',
          payload: pendingResults,
        });

        // only award XP for errors that required a real AI call — cached hits don't count
        await onDiagnosed(uncachedErrors.length);
      },
    );
  } catch (err) {
    console.error('AI failed:', err);
    vscode.window.showErrorMessage('OtterDr Was Swept away by confusion.');
  } finally {
    aiInProgress = false;
  }
}
