import * as vscode from 'vscode';

// pass provider in so function knows where to send the data
export function errorListener(provider: any) {
  // make async in order to access code snippet
  return vscode.languages.onDidChangeDiagnostics(async (event) => {
    // 'event' contains the Uris of the files with changed diagnostics
    for (const uri of event.uris) {
      // get diagnostics for this file
      const diagnostics = vscode.languages.getDiagnostics(uri);
      // filter for errors
      const errors = diagnostics.filter(
        (diagObj) => diagObj.severity === vscode.DiagnosticSeverity.Error,
      );

      if (errors.length > 0) {
        // read the text where error occurred
        const document = await vscode.workspace.openTextDocument(uri);

        // LATER:send to ai the message and codeSnippet
        const errorData = errors.map((err) => ({
          message: err.message, //err message
          line: err.range.start.line + 1, //line where err is
          codeSnippet: document.lineAt(err.range.start.line).text.trim(), //specific line of broken code
          source: uri.fsPath, // file where error is
        }));
        console.log('Error Data:', errorData);
        // send the errors to the provider
        provider.sendErrorsToWebview(errorData);
      }
    }
  });
}

// on hover, get access to diagnostic error
// THEN onclick,save the diagnostic error
// package and send error to AI

// declare variable to hold active text editor (vscode.window.activeTextEditor or something)

// create conditional to see if text editor is active which means there's an error found
// if truthy, grab document.URI (built in) to get diagnostics (array of objects - properties are range, message, severity)
