import * as vscode from 'vscode';

// pass provider in so function knows where to send the data if we're sending it to the webview -> if it goes to the panel, we may need that panel instance to be saved outside of the context.subscriptions.push() so we can pass the variable in?? Or maybe we just invoke the function to listen for the user highlights from inside that .push?
export function errorListener(provider: any) {
  // make async in order to access code snippet
  return vscode.languages.onDidChangeDiagnostics(async (event) => {
    // 'event' contains the Uris of the files with changed diagnostics
    for (const uri of event.uris) {
      // get diagnostics for this file
      const diagnostics = vscode.languages.getDiagnostics(uri);
      // returns filtered array with only the actual errors
      const errors = diagnostics.filter(
        (diagObj) => diagObj.severity === vscode.DiagnosticSeverity.Error,
      );
      console.log('Errors:', errors);

// everything above here is grabbing all the diagnostics and filtering for just the errors

//but, the stuff below is still inside of the for...of loop and requires access to the uris


      if (errors.length > 0) {
        // returns promise with the TextDocument object (the current file in the text editor)
        const document = await vscode.workspace.openTextDocument(uri);
 //NOTE: the objects in the errors array have these properties -> code:, message: <error message>, range: start:{character: 1st ch, line: 1st line}, end: {character: last ch, line: last line}, severity: "Error", source: <from linter, or built-in typescript checker, etc> IMPT: vscode uses 0 based indexing, so character 0 means the first character
 // definitely include "source" in AI call because it provides impt info about the type of error, if it will break code or is just stylistic, etc, also pass the "code" because it helps reduce hallucinations and ties directly to documentation the ai can use
       
        const errorData = errors.map((err) => ({
          code: err.code, 
          message: err.message, //err message
          startLine: err.range.start.line + 1, //line where err is
          source: err.source,
          codeSnippet: document.lineAt(err.range.start.line).text.trim(), //specific line of broken code
          fileSource: uri.fsPath, // file where error is
          aiContext: function () { // grabs 3 lines above and below start of error to provide context to ai, but I'm writing it wrong. I want it to show the value returned from this function would be
            const startLine = Math.max(0, err.range.start.line - 3);
            const endLine = Math.min(document.lineCount - 1, err.range.end.line + 3);
            const contextRange = new vscode.Range(
              startLine, 0,
              endLine, document.lineAt(endLine).text.length
            );
            return document.getText(contextRange);
          }
        }));
        console.log('Extension side error Data:', errorData);
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
