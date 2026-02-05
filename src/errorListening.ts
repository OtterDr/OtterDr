import * as vscode from 'vscode';



export function errorListener() {
  // to get diagnostics for ALL files
  // return the "subscription" so it can be managed
   return vscode.languages.onDidChangeDiagnostics(event => {
    // 'event' contains the Uris of the files with changed diagnostics
    for (const uri of event.uris) {
      // get diagnostics for this file
      const diagnostics = vscode.languages.getDiagnostics(uri);
      if (diagnostics.length > 0) {
        // filter for errors -> in diagnostics, severity 0 = error, severity 1 = warning, severity 2 = info
        const errors = diagnostics.filter(diagObj => diagObj.severity === vscode.DiagnosticSeverity.Error);
        console.log(`Found ${errors.length} errors in this file: ${uri.fsPath}`);
        errors.forEach((error, idx) => {
          console.log(` Error ${idx + 1}: ${error.message} (Line ${error.range.start.line + 1})`);
        });
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
