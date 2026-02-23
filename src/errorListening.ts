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
  console.log('inside errorSelection');
  const editor = vscode.window.activeTextEditor; // this grabs the active text editor
  let selectedText;

  if (!editor) {return null;} // if nothing active do nothing
  const document = editor.document;
  const editorUri = editor.document.uri;
  const diagnostics = vscode.languages.getDiagnostics(editorUri); //grab all errors first
  console.log('editorUri: ', editorUri);

  //lets iterate through diagnostics with the find method to see if highlight matches an existing location and if severity === error
  const selection = editor.selection;
  console.log('selection: ', selection);

  const selectionRange = editor.selection; // selection gives a bigger range automatically
  const cursorPosition = editor.selection.active; // grabs cursor position

  const selectedError = diagnostics.find((diagnostic) => {
    return (
      diagnostic.severity === vscode.DiagnosticSeverity.Error &&
      (diagnostic.range.contains(cursorPosition) ||
        diagnostic.range.intersection(selectionRange) !== undefined)
    );
  });

  if (!selectedError) {return null;}

  console.log('selected error: ', selectedError);
  //grab range to show 3 lines before and after , compare to active errors in diagnostic array

  if (selection && !selection.isEmpty) {
    const selectionRange = new vscode.Range(
      selection.start.line,
      selection.start.character,
      selection.end.line,
      selection.end.character,
    );
    selectedText = editor.document.getText(selectionRange);
    console.log('selected text: ', selectedText);
    // return selectedText;
  }

  if (!selectedError) {
    return null;
  } // if there's no error, don't do anything
  const startLine = selectedError.range.start.line; // grab start line
  const endLine = selectedError.range.end.line; // grab endline
  const newStartLine = Math.max(0, startLine - 3); // make a var for new start to - 3
  const newEndLine = Math.min(editor.document.lineCount - 1, endLine + 3); //make var new end

  // new range and pass in new positions
  // get line at text.length

  const contextRange = new vscode.Range(
    new vscode.Position(newStartLine, 0),
    new vscode.Position(newEndLine, document.lineAt(newEndLine).text.length),
  );

  console.log('context range: ', contextRange);

  // Get the text once
  const errorContext = editor.document.getText(contextRange);
  console.log('error Context:', errorContext);
  const formattedError = {
    message: selectedError.message,
    code: selectedError.code,
    source: selectedError.source,
    fileSource: editorUri.fsPath,
    selectedText: selectedText,
    errorContext: errorContext,
  };
  console.log(formattedError);
  // typed error to send to AI
  const typedErrors: ErrorFormat = formattedError as ErrorFormat;
  console.log('typederrors:', typedErrors);
  return JSON.stringify(typedErrors);
}
