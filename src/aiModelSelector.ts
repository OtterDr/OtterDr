//taken from gemini when asking to incorporate BYOK options

import * as vscode from 'vscode';

export type ProviderType = 'copilot' | 'openai' | 'anthropic';

export interface ModelConfig {
  provider: ProviderType;
  modelId: string;
  displayName: string;
  vscodeModel?: vscode.LanguageModelChat;
}

export const SAVED_CONFIG_KEY = 'otterDr.selectedModelConfig';

// Helper to manage API keys securely in VS Code secrets storage
export async function getStoredApiKey(
  context: vscode.ExtensionContext,
  provider: ProviderType,
): Promise<string | undefined> {
  return await context.secrets.get(`otterDr.apiKey.${provider}`);
}

export async function storeApiKey(
  context: vscode.ExtensionContext,
  provider: ProviderType,
  apiKey: string,
): Promise<void> {
  await context.secrets.store(`otterDr.apiKey.${provider}`, apiKey);
}

export async function deleteApiKey(
  context: vscode.ExtensionContext,
  provider: ProviderType,
): Promise<void> {
  await context.secrets.delete(`otterDr.apiKey.${provider}`);
}

// Live fetch models from provider endpoints
async function fetchRemoteModels(
  provider: ProviderType,
  apiKey: string,
): Promise<Array<{ id: string }>> {
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(
        `OpenAI authentication failed (${res.status} ${res.statusText})`,
      );
    }
    const data = (await res.json()) as { data: Array<{ id: string }> };
    // Filter relevant text/chat models
    return data.data.filter(
      (m) =>
        m.id.startsWith('gpt') ||
        m.id.startsWith('o1') ||
        m.id.startsWith('o3'),
    );
  }

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) {
      throw new Error(
        `Anthropic authentication failed (${res.status} ${res.statusText})`,
      );
    }
    const data = (await res.json()) as { data: Array<{ id: string }> };
    return data.data;
  }

  return [];
}

// Flow for entering key and selecting a model for external providers
async function handleApiKeyFlow(
  context: vscode.ExtensionContext,
): Promise<ModelConfig | undefined> {
  // 1. Select provider
  const providerChoices: Array<{
    label: string;
    provider: ProviderType;
    description?: string;
  }> = [
    {
      label: '$(key) OpenAI',
      provider: 'openai',
      description: 'GPT-4o, o1, etc.',
    },
    {
      label: '$(key) Anthropic',
      provider: 'anthropic',
      description: 'Claude 3.5 Sonnet, Claude 3 Opus, etc.',
    },
  ];

  const selectedProvider = await vscode.window.showQuickPick(providerChoices, {
    placeHolder: 'Select an AI provider to configure your API key',
  });

  if (!selectedProvider) return undefined;

  const provider = selectedProvider.provider;

  // 2. Check for existing key or prompt for new one
  let apiKey = await getStoredApiKey(context, provider);

  const enteredKey = await vscode.window.showInputBox({
    prompt: `Enter your ${selectedProvider.label.replace('$(key) ', '')} API Key`,
    password: true,
    value: apiKey ?? '',
    placeHolder: provider === 'openai' ? 'sk-...' : 'sk-ant-...',
    ignoreFocusOut: true,
  });

  if (!enteredKey) return undefined;
  apiKey = enteredKey;
  await storeApiKey(context, provider, apiKey);

  // 3. Fetch available models with loading indicator
  let availableModels: Array<{ id: string }> = [];
  try {
    availableModels = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Fetching available models from ${selectedProvider.label.replace('$(key) ', '')}...`,
        cancellable: false,
      },
      async () => {
        return await fetchRemoteModels(provider, apiKey!);
      },
    );
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to fetch models: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }

  if (availableModels.length === 0) {
    vscode.window.showErrorMessage(
      `No compatible models returned from ${provider}.`,
    );
    return undefined;
  }

  // 4. Show dynamic model list
  const modelItems = availableModels.map((m) => ({
    label: m.id,
    description: provider,
  }));

  const chosenModel = await vscode.window.showQuickPick(modelItems, {
    placeHolder: `Select a default ${provider.toUpperCase()} model for OtterDr`,
  });

  if (!chosenModel) return undefined;

  const config: ModelConfig = {
    provider,
    modelId: chosenModel.label,
    displayName: `${provider.toUpperCase()} (${chosenModel.label})`,
  };

  // 5. Store configuration in globalState
  await context.globalState.update(SAVED_CONFIG_KEY, config);
  vscode.window.showInformationMessage(
    `OtterDr model set to ${config.displayName}! 🦦`,
  );
  return config;
}

export async function resolveLanguageModel(
  context: vscode.ExtensionContext,
  forceSelect: boolean = false,
): Promise<ModelConfig | undefined> {
  const models = await vscode.lm.selectChatModels({});

  // 1. Check existing saved preference if not forcing selection
  if (!forceSelect) {
    const savedConfig = context.globalState.get<ModelConfig>(SAVED_CONFIG_KEY);
    if (savedConfig) {
      if (savedConfig.provider === 'copilot') {
        const liveModel = models.find((m) => m.id === savedConfig.modelId);
        if (liveModel) {
          return { ...savedConfig, vscodeModel: liveModel };
        }
      } else {
        const key = await getStoredApiKey(context, savedConfig.provider);
        if (key) {
          return savedConfig;
        }
      }
      // Stale configuration cleanup
      await context.globalState.update(SAVED_CONFIG_KEY, undefined);
    }
  }

  // 2. No VS Code native chat models installed
  if (models.length === 0) {
    const action = await vscode.window.showErrorMessage(
      'OtterDr needs a language model to work. Install Copilot or use your own API key.',
      'Get GitHub Copilot',
      'Enter API Key',
    );

    if (action === 'Get GitHub Copilot') {
      vscode.env.openExternal(
        vscode.Uri.parse('vscode:extension/GitHub.copilot-chat'),
      );
      return undefined;
    } else if (action === 'Enter API Key') {
      return await handleApiKeyFlow(context);
    }
    return undefined;
  }

  // 3. Models are available or forceSelect = true: build choice list including BYOK option
  const quickPickItems: Array<{
    label: string;
    description?: string;
    model?: vscode.LanguageModelChat;
    isApiKeyOption?: boolean;
  }> = [
    ...models.map((m) => ({
      label: m.name,
      description: `${m.vendor} (${m.family})`,
      model: m,
    })),
    {
      label: '$(key) Bring Your Own API Key (OpenAI / Anthropic)',
      description: 'Use your own API key directly',
      isApiKeyOption: true,
    },
  ];

  const choice = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: forceSelect
      ? 'Select a model or provider for OtterDr'
      : 'Select the AI model for OtterDr to use',
  });

  if (!choice) return undefined;

  if (choice.isApiKeyOption) {
    return await handleApiKeyFlow(context);
  }

  if (choice.model) {
    const config: ModelConfig = {
      provider: 'copilot',
      modelId: choice.model.id,
      displayName: choice.model.name,
      vscodeModel: choice.model,
    };
    await context.globalState.update(SAVED_CONFIG_KEY, config);
    return config;
  }

  return undefined;
}
