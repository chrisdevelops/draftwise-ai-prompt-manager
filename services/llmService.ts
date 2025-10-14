
import { GoogleGenAI } from "@google/genai";
import { Provider, ModelDefinition } from '../types';

export const ALL_MODELS: ModelDefinition[] = [
    // Gemini
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    // Anthropic - Models are hardcoded as there is no public model listing API.
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' }
];

const getModelProvider = (modelId: string, availableModels: ModelDefinition[]): Provider | undefined => {
    const allKnownModels = [...ALL_MODELS, ...availableModels];
    return allKnownModels.find(m => m.id === modelId)?.provider;
};

// Generates a user-friendly name from a model ID like "gpt-4-turbo" -> "GPT-4 Turbo"
const prettyModelName = (id: string): string => {
  return id
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Gpt', 'GPT');
};

export const fetchOpenAIModels = async (apiKey: string): Promise<ModelDefinition[]> => {
    if (!apiKey) return [];
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!response.ok) {
            console.error("Failed to fetch OpenAI models");
            return [];
        }
        const data = await response.json();
        
        // Filter for chat models (typically gpt-*) and sort them to have newer models first
        const chatModels = data.data
            .filter((model: any) => model.id.startsWith('gpt-') && model.owned_by.includes('openai'))
            .map((model: any) => ({
                id: model.id,
                name: prettyModelName(model.id),
                provider: 'openai' as Provider
            }))
            .sort((a: ModelDefinition, b: ModelDefinition) => b.id.localeCompare(a.id));

        return chatModels;

    } catch (error) {
        console.error("Error fetching OpenAI models:", error);
        return [];
    }
};


export const validateApiKey = async (provider: Provider, apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;

    try {
        switch (provider) {
            case 'gemini':
                const ai = new GoogleGenAI({ apiKey });
                // A simple, low-token prompt to validate the key
                await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'h' });
                return true;
            case 'openai':
                const openaiResponse = await fetch('https://api.openai.com/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                return openaiResponse.ok;
            case 'anthropic':
                 const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: "claude-3-haiku-20240307",
                        max_tokens: 1,
                        messages: [{ role: "user", content: "h" }]
                    })
                });
                return anthropicResponse.ok;
            default:
                return false;
        }
    } catch (error) {
        console.error(`API key validation failed for ${provider}:`, error);
        return false;
    }
};

const estimateTokens = (text: string): number => {
  if (!text) return 0;
  // A common heuristic for token estimation is that one token is roughly 4 characters.
  return Math.ceil(text.length / 4);
};

interface LlmResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export const runPrompt = async (
    modelId: string,
    apiKey: string,
    userPrompt: string,
    systemPrompt: string | undefined,
    availableModels: ModelDefinition[]
): Promise<LlmResponse> => {
    const provider = getModelProvider(modelId, availableModels) || 'openai'; // Default to openai if not found
    if (!apiKey) {
        throw new Error(`API key for ${provider} is not configured.`);
    }

    try {
        switch (provider) {
            case 'gemini': {
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: userPrompt,
                    ...(systemPrompt && { config: { systemInstruction: systemPrompt } })
                });
                const promptTokens = estimateTokens(userPrompt) + estimateTokens(systemPrompt || '');
                const completionTokens = estimateTokens(response.text);
                return {
                    text: response.text,
                    usage: {
                        promptTokens,
                        completionTokens,
                        totalTokens: promptTokens + completionTokens
                    }
                };
            }
            case 'openai': {
                 const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [
                            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                            { role: 'user', content: userPrompt }
                        ]
                    })
                });
                if (!openaiResponse.ok) {
                    const errorData = await openaiResponse.json();
                    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
                }
                const openaiData = await openaiResponse.json();
                return {
                    text: openaiData.choices[0].message.content,
                    usage: {
                        promptTokens: openaiData.usage.prompt_tokens,
                        completionTokens: openaiData.usage.completion_tokens,
                        totalTokens: openaiData.usage.total_tokens
                    }
                };
            }
            case 'anthropic': {
                const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: modelId,
                        max_tokens: 4096,
                        system: systemPrompt,
                        messages: [{ role: "user", content: userPrompt }]
                    })
                });
                 if (!anthropicResponse.ok) {
                    const errorData = await anthropicResponse.json();
                    throw new Error(`Anthropic API error: ${errorData.error?.message || 'Unknown error'}`);
                }
                const anthropicData = await anthropicResponse.json();
                return {
                    text: anthropicData.content[0].text,
                    usage: {
                        promptTokens: anthropicData.usage.input_tokens,
                        completionTokens: anthropicData.usage.output_tokens,
                        totalTokens: anthropicData.usage.input_tokens + anthropicData.usage.output_tokens
                    }
                };
            }
            default:
                throw new Error(`Provider for model ${modelId} not implemented.`);
        }
    } catch (error) {
        console.error(`Error calling ${provider} API:`, error);
        if (error instanceof Error) {
            throw new Error(`An error occurred: ${error.message}`);
        }
        throw new Error(`An unknown error occurred while contacting the ${provider} API.`);
    }
};
