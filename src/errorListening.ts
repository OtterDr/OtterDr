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
        //NOTE: the objects in the errors array have these properties -> code: <code # related to specific error>, message: <error message>, range: start:{character: 1st ch, line: 1st line}, end: {character: last ch, line: last line}, severity: "Error", source: <from linter, or built-in typescript checker, etc> IMPT: vscode uses 0 based indexing, so character 0 means the first character
        // definitely include "source" in AI call because it provides impt info about the type of error, if it will break code or is just stylistic, etc, also pass the "code" because it helps reduce hallucinations and ties directly to error documentation the ai can use
        const errorData = errors.map((err) => {
          const startLine = Math.max(0, err.range.start.line - 3);
          const endLine = Math.min(
            document.lineCount - 1,
            err.range.end.line + 3,
          );
          const contextRange = new vscode.Range(
            startLine,
            0,
            endLine,
            document.lineAt(endLine).text.length,
          );

          // Get the text once
          const contextText = document.getText(contextRange);

          return {
            code: err.code,
            message: err.message,
            startLine: err.range.start.line + 1, //actual error start line
            contextStartLine: startLine, //start line of code for ai
            contextEndLine: endLine, // endline of code for ai
            source: err.source,
            codeSnippet: document.lineAt(err.range.start.line).text.trim(), //snippet of just the error code line
            aiContextSnippet: contextRange, //larger code snippet with error in the middle
            fileSource: uri.fsPath,
          };
        });
       
        console.log('Extension side error Data:', errorData);
        // send the errors to the provider
        provider.sendErrorsToWebview(errorData);
      }
    }
  });
}

