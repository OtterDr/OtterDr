import * as vscode from 'vscode';

export interface ErrorFormat {
  message: string;
  code: number;
  source: string;
  fileSource: string;
  selectedText: string | undefined;
  errorContext: string;
}

// 1. errorListener - listens for errors and tells otter when there's more than one
export function errorListener(callback: (count: number) => void) {
  return vscode.languages.onDidChangeDiagnostics((_event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) { return; }

    const activeUri = editor.document.uri;
    const diagnostics = vscode.languages.getDiagnostics(activeUri);

    const errorCount = diagnostics.filter(
      (d) => d.severity === vscode.DiagnosticSeverity.Error,
    ).length;

    callback(errorCount);
  });
}

// 2. errorSelection - collects all errors overlapping the cursor/selection (capped at 5)
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
      (d.range.contains(cursorPosition) ||
        d.range.intersection(selection) !== undefined)
    )
    .slice(0, 5);

  if (selectedErrors.length === 0) { return null; }

  let selectedText: string | undefined;
  if (!selection.isEmpty) {
    selectedText = document.getText(selection);
  }

  // build one ErrorFormat per error, each with its own 3-line surrounding context
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
