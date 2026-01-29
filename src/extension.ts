// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { join } from "path";
import * as vscode from "vscode";
import { ExtensionContext, ExtensionMode, Uri, Webview } from "vscode";
import { MessageHandlerData } from "@estruyf/vscode";
import { readFileSync } from "fs";

export function activate(context: vscode.ExtensionContext) {// activates this function when vscode is loaded
  // let disposable = vscode.commands.registerCommand(
  //   "otterDr.openWebview",
  //   () => {
      // const panel =  vscode.window.registerWebviewViewProvider( // this is supposed to create a new Instance of  the otterview?
      //   "otterDr.otterView",
      //   "Explorer: open OtterDr view",
      //   vscode.ViewColumn.One,
      //   {
      //     enableScripts: true,
      //     retainContextWhenHidden: true,
      //   }
      // );

      
      class OtterViewProvider implements vscode.WebviewViewProvider{
        public static readonly viewType = "otterDr.otterView";
        private _view?: vscode.WebviewView;
        
        constructor(private readonly _extensionUri: vscode.Uri){
          
        }
        
        public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext,
		      _token: vscode.CancellationToken
        ) {
          this._view = webviewView;
          
          webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
          };
          
          
          
        }
      }
      
      
      const provider = new OtterViewProvider(context.extensionUri);// this is supposed to create a new Instance of the otterview? the class is created later
      
      context.subscriptions.push( 
        vscode.window.registerWebviewViewProvider(
         OtterViewProvider.viewType,
          provider
        ));

//       panel.webview.onDidReceiveMessage(
//         (message) => {
//           const { command, requestId, payload } = message;

//           if (command === "GET_DATA") {
//             // Do something with the payload

//             // Send a response back to the webview
//             panel.webview.postMessage({
//               command,
//               requestId, // The requestId is used to identify the response
//               payload: `Hello from the extension!`,
//             } as MessageHandlerData<string>);
//           } else if (command === "GET_DATA_ERROR") {
//             panel.webview.postMessage({
//               command,
//               requestId, // The requestId is used to identify the response
//               error: `Oops, something went wrong!`,
//             } as MessageHandlerData<string>);
//           } else if (command === "POST_DATA") {
//             vscode.window.showInformationMessage(
//               `Received data from the webview: ${payload.msg}`
//             );
//           }
//         },
//         undefined,
//         context.subscriptions
//       );

//       panel.webview.html = getWebviewContent(context, panel.webview);
//     }
//   );

//   context.subscriptions.push(disposable);
}


// this method is called when your extension is deactivated
export function deactivate() {}

const getWebviewContent = (context: ExtensionContext, webview: Webview) => {
  // const jsFile = "main.bundle.js";
  // const localServerUrl = "http://localhost:9000";

  // let scriptUrl = [];
  // let cssUrl = null;

  // const isProduction = context.extensionMode === ExtensionMode.Production;
  // if (isProduction) {
  //   // Get the manifest file from the dist folder
  //   const manifest = readFileSync(
  //     join(context.extensionPath, "dist", "webview", "manifest.json"),
  //     "utf-8"
  //   );
  //   const manifestJson = JSON.parse(manifest);
  //   for (const [key, value] of Object.entries<string>(manifestJson)) {
  //     if (key.endsWith(".js")) {
  //       scriptUrl.push(
  //         webview
  //           .asWebviewUri(
  //             Uri.file(join(context.extensionPath, "dist", "webview", value))
  //           )
  //           .toString()
  //       );
  //     }
  //   }
  // } else {
  //   scriptUrl.push(`${localServerUrl}/${jsFile}`);
  // }
  
  return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>
	<body>
		<div id="root"></div>
    <p> Hello </p>
    <img src= "/assets/juhele_caution-otters_crossing.svg" alt="Test image">
	</body>
	</html>`;
  
  // return `<!DOCTYPE html>
	// <html lang="en">
	// <head>
	// 	<meta charset="UTF-8">
	// 	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	// 	 ${isProduction ? `<link href="${cssUrl}" rel="stylesheet">` : ""}
	// </head>
	// <body>
	// 	<div id="root"></div>
  //   <p> Hello </p>
  //   <img src= "..assets/webview.png" alt="Test image">
  
	// 	  ${scriptUrl.map((url) => `<script src="${url}"></script>`).join("\n")} 
	// </body>
	// </html>`;
};
