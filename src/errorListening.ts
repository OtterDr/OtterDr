import * as vscode from 'vscode';

export interface ErrorFormat {
  message: string;
  code: number;
  source: string;
  fileSource: string;
  selectedText: string | undefined;
  errorContext: string; // additional lines of code 3 before and 3 after
}

// 1. errorListener - just listens for errors and tells otter when there's more than one
export function errorListener(callback: (count: number) => void) {
  return vscode.languages.onDidChangeDiagnostics((event) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    //check that the changed diagnostics belong to the current file
    const activeUri = editor.document.uri;
    const diagnostics = vscode.languages.getDiagnostics(activeUri);

    //filter for only errors and get count
    const errorCount = diagnostics.filter(
      (diagObj) => diagObj.severity === vscode.DiagnosticSeverity.Error,
    ).length;

    // trigger callback with the new count
    callback(errorCount);
  });
}

// 2. errorSelection - listen for highlighted stuff, bundle pertinent info, make ai fetch request
export function errorSelection() {
  const editor = vscode.window.activeTextEditor;
  let selectedText;

  if (!editor) {return null;}
  const document = editor.document;
  const editorUri = editor.document.uri;
  const diagnostics = vscode.languages.getDiagnostics(editorUri);

  const selection = editor.selection;
  const selectionRange = editor.selection;
  const cursorPosition = editor.selection.active;

  // match the diagnostic under the cursor or overlapping the current selection
  const selectedError = diagnostics.find((diagnostic) => {
    return (
      diagnostic.severity === vscode.DiagnosticSeverity.Error &&
      (diagnostic.range.contains(cursorPosition) ||
        diagnostic.range.intersection(selectionRange) !== undefined)
    );
  });

  if (!selectedError) {return null;}

  if (selection && !selection.isEmpty) {
    const selectionRange = new vscode.Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
    );
    selectedText = editor.document.getText(selectionRange);
  }

  const startLine = selectedError.range.start.line;
  const endLine = selectedError.range.end.line;
  // expand the error range by 3 lines in each direction to give the AI surrounding context
  const newStartLine = Math.max(0, startLine - 3);
  const newEndLine = Math.min(editor.document.lineCount - 1, endLine + 3);

  const contextRange = new vscode.Range(
    new vscode.Position(newStartLine, 0),
    new vscode.Position(newEndLine, document.lineAt(newEndLine).text.length),
  );

  const errorContext = editor.document.getText(contextRange);
  const formattedError = {
    message: selectedError.message,
    code: selectedError.code,
    source: selectedError.source,
    fileSource: editorUri.fsPath,
    selectedText: selectedText,
    errorContext: errorContext,
  };
  const typedErrors: ErrorFormat = formattedError as ErrorFormat;
  return JSON.stringify(typedErrors);
}
