import { join } from "path";
import * as vscode from "vscode";
import { ExtensionContext, ExtensionMode, Uri, Webview } from "vscode";
import { MessageHandlerData } from "@estruyf/vscode";
import { readFileSync } from "fs";
import { errorListener, errorSelection } from "./errorListening";


export function activate(context: vscode.ExtensionContext) {
  console.log("🔴 OtterDr ACTIVATING!");
  const provider = new OtterViewProvider(context.extensionUri); // this is supposed to create a new Instance of the otterview? the class is created later

  // For highlighting & selecting text in code -- Trying it as a command
  context.subscriptions.push(
    vscode.commands.registerCommand("otterDr.highlightedTextGrab", () =>{
      
      const errorSelectionResult = errorSelection(); 
      // "otterDr.highlightedTextGrab" should be changed to "otterDr.AskOtter"
      // dnotes-  new var to hold invocation of errorlistener
      //create error selection func in errorlistening t
      if (!errorSelectionResult){
        console.log("do Nothing");
        return;
      }
      vscode.window.showInformationMessage(`${errorSelectionResult}`);
      // errorContext;

//   const editor = vscode.window.activeTextEditor;
//   if (editor) {
//     const selection = editor.selection;
//     let languageId = editor.document.languageId; // For grabbing the coding language!! --- WIP from Hyeyoon
//     if (selection && !selection.isEmpty) {
//       const selectionRange = new vscode.Range(
//         selection.start.line,
//         selection.start.character,
//         selection.end.line,
//         selection.end.character
//       );
//       const text = editor.document.getText(selectionRange);
//       vscode.window.showInformationMessage(`The selected text is: ${text}`);
//       console.log(`The selected text is: ${text}`);
//     // D Notes - this is where we expect ai translation to be handled for display
//       // let copiedText = vscode.env.clipboard.writeText(text); // For copy pasting the highlighted text to local clipboard of user  
//     }
//   }
}))

  // For displaying the otter on explorer -- Completed!
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      OtterViewProvider.viewType,
      provider
    )
  );

  // Register a command for Status Bar Item: For showing small message window on bottom
  context.subscriptions.push(
    vscode.commands.registerCommand("sample.showSelectionCount", () => {
      vscode.window.showInformationMessage(
        `OtterDr is now diving into your code...🤿🪸`
      );
    })
  );

  // Register a command for Status Bar Item: For displaying the OtterDr error analysis on a separate tab

  context.subscriptions.push(
    vscode.commands.registerCommand("otterDr.openWebview", () => {
      // Create and show a new webview
      const panel = vscode.window.createWebviewPanel(
        "webview-id", // Identifies the type of the webview. Used internally
        "OtterDr Diagnosis 🦦", // Title of the panel displayed to the user
        vscode.ViewColumn.Two, // Editor column to show the new webview panel in. (Opens it on the side as a split editor 'tab'!)
        {} // Webview options. More on these later.
      );
    })
  );

  // A command for simultaneously running multiple commands!
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.allCommands", async () => {
      await vscode.commands.executeCommand("sample.showSelectionCount");
      await vscode.commands.executeCommand("otterDr.openWebview");
      await vscode.commands.executeCommand("otterDr.highlightedTextGrab");
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

  let disposable = errorListener();

  context.subscriptions.push(disposable);
}

//Creating OtterViewProvider -- Completed!
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
          // <script>
          // const vscode = acquireVsCodeApi();
          // window.addEventListener('message', event => {
          // const message = event.data;
          // if (message.type === 'SET_ERRORS') {
          // console.log("Error count in webview:", message.errors.length);
          // console.log("Webview recieved error data:", message.errors);
          //   }
          // });
          // </script>
     </body>
     </html>`;
  }
}

// method. Usually returns a valid HTML in the form of a string
// export function deactivate() {}

//  =============== Some Notes =================
//  webviewView = instance of vscode.WebviewView; represents a custom view you registered
// webviewView.webview = VERY important for images! The actual webview object inside that container. Can render JS, HTML, CSS, images (with some rules) and behaves like a sandboxed browser
// webviewView.webview.html --> Is a property (NOT function), when you assign string to it VS Code loads it as full HTML doc
// this._getHtmlForWebview --> The 
