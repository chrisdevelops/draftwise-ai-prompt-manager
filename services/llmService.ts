import { GoogleGenAI } from "@google/genai";
import { Provider, ModelDefinition } from '../types';

export const ALL_MODELS: ModelDefinition[] = [
    // Gemini
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    // OpenAI
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
    // Anthropic
    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' }
];

const getModelProvider = (modelId: string): Provider | undefined => {
    return ALL_MODELS.find(m => m.id === modelId)?.provider;
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

export const runPrompt = async (
    modelId: string,
    apiKey: string,
    userPrompt: string,
    systemPrompt?: string
): Promise<string> => {
    const provider = getModelProvider(modelId);
    if (!provider) {
        return Promise.reject(new Error(`Unknown model: ${modelId}`));
    }
    if (!apiKey) {
        return Promise.reject(new Error(`API key for ${provider} is not configured.`));
    }

    try {
        switch (provider) {
            case 'gemini':
                const ai = new GoogleGenAI({ apiKey });
                const response = await ai.models.generateContent({
                    model: modelId,
                    contents: userPrompt,
                    ...(systemPrompt && { config: { systemInstruction: systemPrompt } })
                });
                return response.text;
            case 'openai':
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
                    throw new Error(`OpenAI API error: ${errorData.error.message}`);
                }
                const openaiData = await openaiResponse.json();
                return openaiData.choices[0].message.content;
            case 'anthropic':
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
                    throw new Error(`Anthropic API error: ${errorData.error.message}`);
                }
                const anthropicData = await anthropicResponse.json();
                return anthropicData.content[0].text;
            default:
                throw new Error(`Provider for model ${modelId} not implemented.`);
        }
    } catch (error) {
        console.error(`Error calling ${provider} API:`, error);
        if (error instanceof Error) {
            return `An error occurred: ${error.message}`;
        }
        return `An unknown error occurred while contacting the ${provider} API.`;
    }
};
