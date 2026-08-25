import * as vscode from 'vscode';

//Storing the default model key in this variable
const SAVED_MODEL_KEY = 'otterDr.selectedModelId';

//Helper function used to fetch, validate, and select the default language model, returns the selected model or undefined if no model is available or selected
export async function resolveLanguageModel(
  context: vscode.ExtensionContext,
  forceSelect: boolean = false,
): Promise<vscode.LanguageModelChat | undefined> {
  const models = await vscode.lm.selectChatModels({});
  console.log(
    'Available models:',
    models.map((m) => m.name),
  );
  //Handles if no models are installed
  if (models.length === 0) {
    const action = await vscode.window.showErrorMessage(
      'OtterDr currently uses GitHub Copilot to work. Please install the extension to get started.',
      'Get GitHub Copilot',
      'Enter API Key',
    );
    if (action === 'Get GitHub Copilot') {
      vscode.env.openExternal(
        vscode.Uri.parse('vscode:extension/GitHub.copilot-chat'),
      );
    } else if (action === 'Enter API Key') {
      //a dropdown to select the provider (openai, anthropic, etc)
      //then an input box for the API key
      //stores API in the secrets storage first?
      //user has to press "get available models"
      //then there is a pause, maybe a loading spinner or on the status bar to show that it's getting models
      //on load, another dropdown appears with the available models from that provider based on the API key provided
      //then the user can select a model and it will be stored in the global state as the default model
      //
    }
    return undefined;
  }

  //Check the stored preference if not forcing a new selection
  if (!forceSelect) {
    const savedModelId = context.globalState.get<string>(SAVED_MODEL_KEY);
    if (savedModelId) {
      const savedModel = models.find((m) => m.id === savedModelId);
      if (savedModel) {
        return savedModel;
      }
    }
  }

  //User selection / the default model selection if only one exists
  if (models.length === 1) {
    const singleModel = models[0];
    await context.globalState.update(SAVED_MODEL_KEY, singleModel.id);
    return singleModel;
  }

  //Dropdown of other models
  const quickPickItems = models.map((m) => ({
    label: m.name,
    description: `${m.vendor} (${m.family})`,
    model: m,
  }));

  const choice = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: forceSelect
      ? 'Select a new default AI model for OtterDr'
      : 'Select the AI language model for OtterDr to use',
  });

  if (choice) {
    await context.globalState.update(SAVED_MODEL_KEY, choice.model.id);
    return choice.model;
  }

  return undefined;
}
