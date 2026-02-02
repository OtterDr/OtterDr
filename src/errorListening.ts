import * as vscode from "vscode";
import { Uri } from "vscode"

// vscode.Uri = uniform resource identifier for standardized and platform-independent ways to handle paths to files, remote resources, abstracting diff b/w operating systems
    // with webview - asWebviewUri is used to convert extension resource URI into format webview can securely access

// to get collection of errors from Problems tab -> vscode.languages.createDiagnosticCollection
// const uri = vscode.Uri;
// console.log(uri);
const errorCollection = vscode.languages.createDiagnosticCollection
console.log(errorCollection);
// on hover, get access to diagnostic error
    // THEN onclick,save the diagnostic error 
    // package and send error to AI


// create function to get errors

// declare variable to hold active text editor (vscode.window.activeTextEditor or something)

// create conditional to see if text editor is active which means there's an error found
    // if truthy, grab document.URI (built in) to get diagnostics (array of objects - properties are range, message, severity)

