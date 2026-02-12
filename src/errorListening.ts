import * as vscode from 'vscode';

// pass provider in so function knows where to send the data if we're sending it to the webview -> if it goes to the panel, we may need that panel instance to be saved outside of the context.subscriptions.push() so we can pass the variable in?? Or maybe we just invoke the function to listen for the user highlights from inside that .push?
interface ErrorFormat {
  message: string;
  code: number | string;
  source: string;
  fileSource: string;
  snippet: string;
  selectedText: string;
  errorContext: string;
}

export function errorListener(provider: any) {
/* D Notes
here is where we place the editor with  activated text
check if  activated text is happening if not return null/ nothing 


*/



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

        //FOR LATER: send a message to otter webview letting it know there are errors
          // front end can use this to update the emote state
        
        //FIRST: have to add the highlight text function inside of this function so we can access the variables "selection", "selectionRange", "languageId" (this is not currently on our interface, but maybe should be?)

        //NEXT: use array method errors.find() to return the element/diagnostic with an err.range.start.line that matches the selectionRange of the highlighted text -> const matchingError = errors.find(<whatever gets passed in here>)
          //FOR EDGE CASES: if there are multiple errors on the same line, we may want to also compare the "selection" text to the code snippet (see how to access it below) to be sure we're grabbing the correct error diagnostic

        //THEN: 
          // get the larger context range (rewrite how that's done below)
          // grab the relevant properties from the matching diagnostic error
          // bundle the above, along with other error info from the interface into the return object 


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
  /*   
  return ({
  message: diagnostic.message
  code: diagnostic.code
  source: diagnostic.source
  fileSource: diagnostic.fileSource
  snippet: string;
  selectedText: string;
  errorContext: string;
  })
  */
}

