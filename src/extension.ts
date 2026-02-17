import { join } from "path";
import * as vscode from "vscode";
import { ExtensionContext, ExtensionMode, Uri, Webview } from "vscode";
import { MessageHandlerData } from "@estruyf/vscode";
import { readFileSync } from "fs";
import { errorListener, errorSelection } from "./errorListening";


export function activate(context: vscode.ExtensionContext) {
  console.log("🔴 OtterDr ACTIVATING!");

  // Creates a new Instance of the otterview
  // !!OtterViewProvider class is created later, outside of the activate function!!
  const provider = new OtterViewProvider(context.extensionUri);

// For displaying the otter image on explorer
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OtterViewProvider.viewType,
      provider
    )
  );

  // Register a command for Status Bar Item: For displaying the OtterDr error analysis on a separate tab & For highlighting & selecting text in code, sending error to backend and receiving response
  context.subscriptions.push(
    vscode.commands.registerCommand("otterDr.openWebview", () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "webview-id", // Identifies the type of the webview. Used internally
        "OtterDr Diagnosis 🦦", // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in. (Opens it on the side as a split editor 'tab'!)
        {
          //Enable Javascript/React in the webview
          enableScripts: true,
        } // Webview options. More on these later.
      );
      
      const errorSelectionResult = errorSelection(); 
      if (!errorSelectionResult){
        console.log("do Nothing");
        return;
      }

      panel.webview.html = `<!DOCTYPE html>
     <html lang="en">
     <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
     </head>
     <body>
       <div id="root"> ${errorSelectionResult} </div>
     </body>
     </html>`;
    })
  );

  // Register a command for Status Bar Item: For showing small message window on bottom
  context.subscriptions.push(
    vscode.commands.registerCommand("otterDr.showStatusBarMessage", () => {
      vscode.window.showInformationMessage(
        `OtterDr is now diving into your code...🤿🪸`
      );
    })
  );
  
  // Create a new status bar item that we can now manage (Also lets commands above run when clicked) -- Completed!
  const myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  myStatusBarItem.command = "extension.allCommands"; //allows the status bar to execute multiple
  context.subscriptions.push(myStatusBarItem);
  myStatusBarItem.text = "🦦 OtterDr";
  myStatusBarItem.show();

  // A command for simultaneously running multiple commands!
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.allCommands", async () => {
      await vscode.commands.executeCommand("otterDr.showStatusBarMessage");
      await vscode.commands.executeCommand("otterDr.openWebview");
      // Whatever is sent to backend should be in a JSON format
    })
  );

  // From errorListening.ts
  let disposable = errorListener();
  context.subscriptions.push(disposable);
}

//CLASS
//Creating OtterViewProvider (Displays otter image)
class OtterViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "otterDr.otterView";
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

// method to push error data to the webview
// CHANGE BELOW - only send a message telling otterView that there's an error, no error info
  public sendErrorsToWebview(errors: vscode.Diagnostic[]) {
    if (this._view) {
     this._view.webview.postMessage({
        type: 'SET_ERRORS',
        errors: errors, // array of error objects
      });
    }
  }
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      // Restricts webview to loading content only from our extension ("localResourceRoots defines a set of root URIs from which local content may be loaded" - https://code.visualstudio.com/api/extension-guides/webview#controlling-access-to-local-resources)
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const image = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "assets", "Default Image.png")
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

// // this method is called when your extension is deactivated
export function deactivate() {}

//  =============== Some Notes =================
//  webviewView = instance of vscode.WebviewView; represents a custom view you registered
// webviewView.webview = VERY important for images! The actual webview object inside that container. Can render JS, HTML, CSS, images (with some rules) and behaves like a sandboxed browser
// webviewView.webview.html --> Is a property (NOT function), when you assign string to it VS Code loads it as full HTML doc
// this._getHtmlForWebview --> The 
