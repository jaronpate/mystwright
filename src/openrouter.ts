import type { OpenRouterCompletionResponse } from "./types";

export async function generateCompletion<T extends Record<string, any> | undefined = undefined>(
    model: string,
    previousMessages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    schema?: T,
    config: { apiKey?: string } = {}
): Promise<T extends undefined ? string : Record<string, any> | Array<Record<string, any>>> {
    const openrouterAPIKey = config.apiKey ?? process.env.OPENROUTER_API_KEY;

    if (openrouterAPIKey === undefined || openrouterAPIKey === null) {
        throw new Error('OpenRouter API key is required');
    }
    
    const body: {
        model: string;
        messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
        response_format?: {
            type: 'json_schema';
            json_schema: object;
        };
    } = {
        model,
        messages: previousMessages,
    }

    if (schema) {
        body.response_format = {
            type: 'json_schema',
            json_schema: schema
        }
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterAPIKey}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json() as OpenRouterCompletionResponse;

    if (data.error) {
        console.error('OpenRouter API error:', data.error);
        throw new Error(`OpenRouter API error: ${data.error.message}`);
    }
    
    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response format from OpenRouter API');
    }

    if (schema) {
        const parsedResponse = JSON.parse(data.choices[0].message.content);
        return parsedResponse as T extends undefined ? string : Record<string, any>;
    } else {
        return data.choices[0].message.content as T extends undefined ? string : Record<string, any>;
    }
}

export const OpenRouter = {
    generateCompletion
}