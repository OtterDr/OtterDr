import * as vscode from 'vscode';
/* EXTENSION FILE - The BACKEND part of this
This file hosts the webview. In this file you should:
*/


//Define a class with methods to render, dispose, and manage the Webview lifecycle.
class ErrorViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'otterDr.errorView';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}
 
  //render
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Define actions in an ("lookup object") object to act as router or router-handler for messages sent between webview and extension host 
    const actions: Record<string, (value: any) => void> = {
      runCommand: () =>
        vscode.commands.executeCommand('workbench.action.showErrorsWarnings'),
      showInfo: (val) => vscode.window.showInformationMessage(val),
      updateSetting: (val) =>
        vscode.workspace.getConfiguration('otter').update('enabled', val),
    };

    // Handle messages by looking up the action
    webviewView.webview.onDidReceiveMessage((data) => {
      const action = actions[data.type];
      if (action) {
        action(data.value);
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Accessing a workspace setting to display in the UI
    const isEnabled = vscode.workspace
      .getConfiguration('otter')
      .get('enabled', true);

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: sans-serif; padding: 10px; }
                    button { cursor: pointer; display: block; margin-bottom: 5px; width: 100%; }
                </style>
            </head>
            <body>
                <h3>OtterDr</h3>
                <p>Status: <strong>${isEnabled ? 'Active' : 'Paused'}</strong></p>
                
                <button id="problemsBtn">View Problems</button>
                <button id="msgBtn">Ping Extension</button>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    document.getElementById('problemsBtn').onclick = () => {
                        vscode.postMessage({ type: 'runCommand' });
                    };

                    document.getElementById('msgBtn').onclick = () => {
                        vscode.postMessage({ type: 'showInfo', value: 'Hello from the Webview!' });
                    };
                </script>
            </body>
            </html>`;
  }
}

//Create a method to return the HTML content for the Webview.

//Link to the Webview file and access VSCode elements like commands and settings.

//Access the vscode and workspace elements such as commands and settings and manipulate them.
