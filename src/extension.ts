import { join } from 'path';
import * as vscode from 'vscode';
import { ExtensionContext, ExtensionMode, Uri, Webview } from 'vscode';
import { MessageHandlerData } from '@estruyf/vscode';
import { readFileSync } from 'fs';
import { errorListener } from './errorListening';

/* CHANGES KATY MADE: 
* errorListener function defined in errorListening.ts, imported here and invoked with disposable
* package.json, updated activationEvents to include "onStartupFinished" which makes the extension activate after VS Code has finished its main startup process -> then calls the activate function. best practice over * wildcard because it doesn't impact overall startup

*/
export function activate(context: vscode.ExtensionContext) {
  console.log('🔴 OtterDr ACTIVATING!');
  const provider = new OtterViewProvider(context.extensionUri); // this is supposed to create a new Instance of the otterview? the class is created later

  // For displaying the otter on explorer -- Completed!
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OtterViewProvider.viewType,
      provider,
    ),
  );

  // For adding Code Action to the lightbulb -- WIP (Look at Emojizer in https://github.com/microsoft/vscode-extension-samples/blob/main/code-actions-sample/src/extension.ts + later on, Emojinfo)
  // context.subscriptions.push(
  //   vscode.languages.registerCodeActionsProvider('markdown', new OtterDrCodeActionProvider(), {
  //     providedCodeActionKinds: OtterDrCodeActionProvider.providedCodeActionKinds
  //   })
  // );

  let disposable = errorListener();

  // export function activate(context: vscode.ExtensionContext) {
  // I think registerCommand sets it to only deal with the errors when the user asks to do it from the control panel, vs always listening
  // let disposable = vscode.commands.registerCommand(
  //   'extension.logAllErrors',
  //   () => {
  //     // Get diagnostics for all files
  //     //  const allDiagnostics = vscode.languages.getDiagnostics();
  //     const allDiagnostics = errorListener();

  //     if (allDiagnostics.length === 0) {
  //       vscode.window.showInformationMessage(
  //         'No errors found in the workspace.',
  //       );
  //       return;
  //     }

  //     console.log('--- VS Code Errors and Warnings ---');

  //     //  allDiagnostics.forEach(([uri, diagnostics]) => {
  //     //      if (diagnostics.length > 0) {
  //     //          console.log(`File: ${uri.fsPath}`);
  //     //          diagnostics.forEach(diagnostic => {
  //     //              // Log the error message, severity, range, and source
  //     //              console.log(`  [${vscode.DiagnosticSeverity[diagnostic.severity]}] Line ${diagnostic.range.start.line + 1}: ${diagnostic.message} (Source: ${diagnostic.source})`);
  //     //          });
  //     //      }
  //     //  });
  //     console.log('--- End of Diagnostics ---');
  //     vscode.window.showInformationMessage(
  //       'All errors logged to the Debug Console.',
  //     );
  //   },
  // );

  context.subscriptions.push(disposable);
}

// createDiagnosticCollection = Creates a managed colelction of code diagnostics ('errors, warnings, hints etc) which are then displayed in the editor as red squigglies and the Problems panel ==> IN SHORT, THIS ARTIFICIALLY CREATES ERROR DIAGNOSTICS!
// const emojiDiagnostics = vscode.languages.createDiagnosticCollection("emoji"); // For this particular example, they are making every single instance of the string "emoji" pop up as squigglies in the given repo!
// context.subscriptions.push(emojiDiagnostics);


//Creating OtterViewProvider -- Completed! 
class OtterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'otterDr.otterView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }
  private _getHtmlForWebview(webview: vscode.Webview) {
    const image = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        "assets",
        "Default Image.png"
      )
    );

    return `<!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
     </head>
     <body>
       <div id="root"></div>
       <img src ="${image}" alt= "Otter image">
     </body>
     </html>`;
  }
}

//Creating Code Action -- WIP
// class OtterDrCodeActionProvider implements vscode.CodeActionProvider {
//   static providedCodeActionKinds: readonly CodeActionKind[] | undefined;}




// this method is called when your extension is deactivated
// export function deactivate() {}

// const getWebviewContent = (context: ExtensionContext, webview: Webview) => {
//   const jsFile = 'main.bundle.js';
//   const localServerUrl = 'http://localhost:9000';

//   let scriptUrl = [];
//   let cssUrl = null;

//   const isProduction = context.extensionMode === ExtensionMode.Production;
//   if (isProduction) {
//     // Get the manifest file from the dist folder
//     const manifest = readFileSync(
//       join(context.extensionPath, 'dist', 'webview', 'manifest.json'),
//       'utf-8',
//     );
//     const manifestJson = JSON.parse(manifest);
//     for (const [key, value] of Object.entries<string>(manifestJson)) {
//       if (key.endsWith('.js')) {
//         scriptUrl.push(
//           webview
//             .asWebviewUri(
//               Uri.file(join(context.extensionPath, 'dist', 'webview', value)),
//             )
//             .toString(),
//         );
//       }
//     }
//   } else {
//     scriptUrl.push(`${localServerUrl}/${jsFile}`);
//   }

//   return `<!DOCTYPE html>
// 	<html lang="en">
// 	<head>
// 		<meta charset="UTF-8">
// 		<meta name="viewport" content="width=device-width, initial-scale=1.0">
// 	</head>
// 	<body>
// 		<div id="root"></div>
//     <p> Hello </p>
//     <img src="/assets/juhele_caution-otters_crossing.svg" alt="Test image">
// 	</body>
// 	</html>`;
// };

//  =============== Some Notes =================
//  webviewView = instance of vscode.WebviewView; represents a custom view you registered
// webviewView.webview = VERY important for images! The actual webview object inside that container. Can render JS, HTML, CSS, images (with some rules) and behaves like a sandboxed browser
// webviewView.webview.html --> Is a property (NOT function), when you assign string to it VS Code loads it as full HTML doc
// this._getHtmlForWebview --> The method. Usually returns a valid HTML in the form of a string
