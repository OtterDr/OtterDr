// errorListening.ts — two focused utilities for reading VS Code diagnostic data.
// Neither holds any state; both are called from extension.ts.
// 'errorListener' drives the otter's live mood reaction to active-file errors.
// 'errorSelection' packages the selected errors into a format the AI translator can consume.

import * as vscode from 'vscode';

// shape of a single error bundled for the AI — one object per diagnostic collected
export interface ErrorFormat {
  message: string;                  // raw diagnostic message (e.g. "Cannot find name 'x'")
  code: number;                     // numeric error code from the language server
  source: string;                   // tool that raised the error (e.g. 'ts', 'eslint')
  fileSource: string;               // absolute path of the file containing the error
  selectedText: string | undefined; // text the user had highlighted, if any
  errorContext: string;             // 3 lines above/below the error for surrounding code context
}

// subscribes to VS Code's diagnostic change event and calls the callback with the current
// error count whenever diagnostics update in the active editor.
// Used to switch the otter image between default and confused states in real time.
// Returns a Disposable so extension.ts can register it in context.subscriptions for cleanup.
export function errorListener(callback: (count: number) => void) {
  return vscode.languages.onDidChangeDiagnostics((_event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const activeUri = editor.document.uri;
    const diagnostics = vscode.languages.getDiagnostics(activeUri);

    // only count Error severity — Warnings and Hints don't trigger the confused otter
    const errorCount = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    ).length;

    callback(errorCount);
  });
}

// collects all Error-severity diagnostics that overlap the user's cursor position or selection
// and formats them for the AI. Called when the user triggers a diagnosis via the status bar.
export function errorSelection(): string | null {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return null; }

  const document = editor.document;
  const editorUri = editor.document.uri;
  const diagnostics = vscode.languages.getDiagnostics(editorUri);
  const selection = editor.selection;
  const cursorPosition = selection.active;

  const selectedErrors = diagnostics
    .filter((d) =>
      d.severity === vscode.DiagnosticSeverity.Error &&
      // include the error if it contains the cursor OR overlaps any part of the selection
      (d.range.contains(cursorPosition) ||
        d.range.intersection(selection) !== undefined)
    )
    // cap at 5 to keep the AI prompt within a reasonable token budget
    .slice(0, 5);

  if (selectedErrors.length === 0) { return null; }

  // capture the highlighted text once — it is shared across all errors in the batch
  let selectedText: string | undefined;
  if (!selection.isEmpty) {
    selectedText = document.getText(selection);
  }

  // build one ErrorFormat per error, each with 3 lines of surrounding code for context.
  // the context helps the AI understand what the code is doing, not just what the error says.
  const formattedErrors: ErrorFormat[] = selectedErrors.map((error) => {
    const newStartLine = Math.max(0, error.range.start.line - 3);
    const newEndLine = Math.min(document.lineCount - 1, error.range.end.line + 3);
    const contextRange = new vscode.Range(
      new vscode.Position(newStartLine, 0),
      new vscode.Position(newEndLine, document.lineAt(newEndLine).text.length),
    );
    return {
      message: error.message,
      code: error.code,
      source: error.source,
      fileSource: editorUri.fsPath,
      selectedText,
      errorContext: document.getText(contextRange),
    } as ErrorFormat;
  });

  return JSON.stringify(formattedErrors);
}
