import type { OpenRouterChatCompletionResponse, Tool } from "./types";

export async function generateCompletion<T extends Record<string, any> | undefined = undefined, K = T extends undefined ? string : Record<string, any> | Array<Record<string, any>>>(
    model: string,
    previousMessages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    config: { apiKey?: string, schema?: T, tools?: Array<Tool> } = {}
): Promise<K> {
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

    if (config.schema) {
        body.response_format = {
            type: 'json_schema',
            json_schema: config.schema
        }
    }

    if (config.tools) {
        body.messages.push({
            role: 'system',
            content: `You have access to the following tools: ${config.tools.map(tool => tool.name).join(', ')}.`
        });

        for (const tool of config.tools) {
            body.messages.push({
                role: 'system',
                content: `Use the tool ${tool.name} when: ${tool.when}.`
            });
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

    const data = await response.json() as OpenRouterChatCompletionResponse;

    // console.log('OpenRouter API response:', JSON.stringify(data, null, 4));

    if (data.error) {
        console.error('OpenRouter API error:', data.error);
        throw new Error(`OpenRouter API error: ${data.error.message}`);
    }
    
    if (!data.choices || !data.choices[0]?.message?.content) {
        throw new Error('Invalid response format from OpenRouter API');
    }

    if (data.choices[0].finish_reason === 'tool_call') {
        // TODO: Handle tool call
    }

    if (config.schema) {
        const parsedResponse = JSON.parse(data.choices[0].message.content);
        return parsedResponse as K;
    } else {
        return data.choices[0].message.content as K;
    }
}

export const OpenRouter = {
    generateCompletion
}