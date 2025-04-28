import type { World, Item, NPC, Place, Quest, ItemID, NPCID, PlaceID, QuestID } from './types';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const SYSTEM_PROMPT = `\
`;
const WORLD_GENERATION_PROMPT = `\
Create a cohesive small fantasy world.

Your response must be a valid JSON object matching the schema defined below. Do not include any explanations, only the JSON object.

Generate a fantasy world with:
- 3-5 unique Places
- 4-6 NPCs
- 4-6 Items
- 1-3 Quests

Each Place should connect to 1-3 other Places. Some NPCs should be associated with quests or hold items. Items must be appropriate for a fantasy setting. Quests should either involve retrieving items or visiting locations.

All IDs should follow a simple pattern like "place1", "npc1", etc. Ensure all references (placeId, itemId, etc.) point to valid existing IDs in your world.

The world must be internally consistent with interwoven elements that make sense together.\
`;

// Type representing the data structure from OpenRouter (different from our Map-based World type)
type APIWorldResponse = {
    places: Array<{
        id: string;
        name: string;
        description: string;
        connections: string[];
        items: string[];
    }>;
    npcs: Array<{
        id: string;
        name: string;
        description: string;
        dialogueSeed: string;
        inventory?: string[];
        hp: number;
        maxHp: number;
        attack: number;
        placeId: string;
        questId?: string;
    }>;
    items: Array<{
        id: string;
        name: string;
        description: string;
        type: 'consumable' | 'equipment' | 'weapon';
    }>;
    quests: Array<{
        id: string;
        name: string;
        description: string;
        objective: string;
        requiredItemId?: string;
        destinationPlaceId?: string;
        rewardItemId?: string;
    }>;
};

type OpenRouterResponse = {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    error?: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
};

interface GenerateWorldConfig {
    apiKey?: string;
    model?: string;
}

/**
 * Generates a fantasy world by sending a request to OpenRouter's API
 * using structured JSON output format
 */
async function generateWorld(config: GenerateWorldConfig = {}): Promise<World> {
    const apiKey = config.apiKey || OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OpenRouter API key is required");
    }

    const model = config.model || "openai/gpt-4o";

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: SYSTEM_PROMPT
                    },
                    {
                        role: "user",
                        content: WORLD_GENERATION_PROMPT
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "fantasyWorld",
                        strict: true,
                        schema: {
                            type: "object",
                            properties: {
                                places: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            description: { type: "string" },
                                            connections: {
                                                type: "array",
                                                items: { type: "string" }
                                            },
                                            items: {
                                                type: "array",
                                                items: { type: "string" }
                                            }
                                        },
                                        required: ["id", "name", "description", "connections", "items"],
                                        additionalProperties: false
                                    }
                                },
                                npcs: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            description: { type: "string" },
                                            dialogueSeed: { type: "string" },
                                            inventory: {
                                                type: "array",
                                                items: { type: "string" }
                                            },
                                            hp: { type: "number" },
                                            maxHp: { type: "number" },
                                            attack: { type: "number" },
                                            placeId: { type: "string" },
                                            questId: { type: "string" }
                                        },
                                        required: ["id", "name", "description", "dialogueSeed", "inventory", "hp", "maxHp", "attack", "placeId", "questId"],
                                        additionalProperties: false
                                    }
                                },
                                items: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            description: { type: "string" },
                                            type: { type: "string", enum: ["consumable", "equipment", "weapon"] }
                                        },
                                        required: ["id", "name", "description", "type"],
                                        additionalProperties: false
                                    }
                                },
                                quests: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            id: { type: "string" },
                                            name: { type: "string" },
                                            description: { type: "string" },
                                            objective: { type: "string" },
                                            requiredItemId: { type: "string" },
                                            destinationPlaceId: { type: "string" },
                                            rewardItemId: { type: "string" }
                                        },
                                        required: ["id", "name", "description", "objective", "requiredItemId", "destinationPlaceId", "rewardItemId"],
                                        additionalProperties: false
                                    }
                                }
                            },
                            required: ["places", "npcs", "items", "quests"],
                            additionalProperties: false
                        }
                    }
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenRouter API error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as OpenRouterResponse;

        if (data.error) {
            console.error("OpenRouter API error:", data.error);
            throw new Error(`OpenRouter API error: ${data.error.message}`);
        }

        console.log("OpenRouter API response:");
        console.log(JSON.stringify(data, null, 4));

        if (!data.choices || !data.choices[0]?.message?.content) {
            throw new Error("Invalid response format from OpenRouter API");
        }

        // Parse the JSON content from the response
        const worldJson: APIWorldResponse = JSON.parse(data.choices[0].message.content);

        console.log("Generated world JSON:");
        console.log(JSON.stringify(worldJson, null, 4));

        // Validate the response structure
        validateWorldStructure(worldJson);

        const world = constructWorldStructure(worldJson);

        return world;
    } catch (error) {
        console.error("Failed to generate world:", error);
        throw error;
    }
}

/**
 * Validates that the world structure matches the expected format
 */
function validateWorldStructure(world: APIWorldResponse): void {
    if (!world.places || !Array.isArray(world.places)) {
        throw new Error("World must contain 'places' object");
    }

    if (!world.npcs || !Array.isArray(world.npcs)) {
        throw new Error("World must contain 'npcs' object");
    }

    if (!world.items || !Array.isArray(world.items)) {
        throw new Error("World must contain 'items' object");
    }

    if (!world.quests || !Array.isArray(world.quests)) {
        throw new Error("World must contain 'quests' object");
    }

    // Check that there are the required number of entitie
    if (world.places.length < 3 || world.places.length > 5) {
        throw new Error("World must contain between 3 and 5 places");
    }

    if (world.npcs.length < 4 || world.npcs.length > 6) {
        throw new Error("World must contain between 4 and 6 NPCs");
    }

    if (world.items.length < 4 || world.items.length > 6) {
        throw new Error("World must contain between 4 and 6 items");
    }

    if (world.quests.length < 1 || world.quests.length > 3) {
        throw new Error("World must contain between 1 and 3 quests");
    }

    // Validate place references and connections
    const placeIds = new Set(world.places.map(place => place.id));
    const npcIds = new Set(world.npcs.map(npc => npc.id));
    const questIds = new Set(world.quests.map(quest => quest.id));
    const itemIds = new Set(world.items.map(item => item.id));

    for (const place of world.places) {
        if (!placeIds.has(place.id)) {
            throw new Error(`Place ID ${place.id} is not valid`);
        }
        // Check that connections are valid place IDs
        for (const connection of place.connections) {
            if (!placeIds.has(connection)) {
                throw new Error(`Place ID ${connection} in connections of ${place.id} is not valid`);
            }
        }
        // Check that items are valid item IDs
        for (const item of place.items) {
            if (!itemIds.has(item)) {
                throw new Error(`Item ID ${item} in items of ${place.id} is not valid`);
            }
        }
    }

    for (const npc of world.npcs) {
        if (!npcIds.has(npc.id)) {
            throw new Error(`NPC ID ${npc.id} is not valid`);
        }
        // Check that the placeId is valid
        if (!placeIds.has(npc.placeId)) {
            throw new Error(`Place ID ${npc.placeId} for NPC ${npc.id} is not valid`);
        }
        // Check that the questId is valid if it exists
        if (npc.questId && !questIds.has(npc.questId)) {
            throw new Error(`Quest ID ${npc.questId} for NPC ${npc.id} is not valid`);
        }
        // Check that the inventory items are valid item IDs if they exist
        if (npc.inventory) {
            for (const item of npc.inventory) {
                if (!itemIds.has(item)) {
                    throw new Error(`Item ID ${item} in inventory of NPC ${npc.id} is not valid`);
                }
            }
        }
    }

    for (const quest of world.quests) {
        if (!questIds.has(quest.id)) {
            throw new Error(`Quest ID ${quest.id} is not valid`);
        }
        // Check that the requiredItemId is valid if it exists
        if (quest.requiredItemId && !itemIds.has(quest.requiredItemId)) {
            throw new Error(`Item ID ${quest.requiredItemId} for quest ${quest.id} is not valid`);
        }
        // Check that the destinationPlaceId is valid if it exists
        if (quest.destinationPlaceId && !placeIds.has(quest.destinationPlaceId)) {
            throw new Error(`Place ID ${quest.destinationPlaceId} for quest ${quest.id} is not valid`);
        }
        // Check that the rewardItemId is valid if it exists
        if (quest.rewardItemId && !itemIds.has(quest.rewardItemId)) {
            throw new Error(`Item ID ${quest.rewardItemId} for quest ${quest.id} is not valid`);
        }
    }
}

function constructWorldStructure(raw: APIWorldResponse): World {
    const world: World = {
        places: new Map(),
        npcs: new Map(),
        items: new Map(),
        quests: new Map()
    };

    // Populate the world with places, npcs, items, and quests
    for (const place of raw.places) {
        world.places.set(place.id as PlaceID, {
            ...place,
            id: place.id as PlaceID,
            connections: place.connections as PlaceID[],
            items: place.items as ItemID[]
        });
    }

    for (const npc of raw.npcs) {
        world.npcs.set(npc.id as NPCID, {
            ...npc,
            id: npc.id as NPCID,
            placeId: npc.placeId as PlaceID,
            questId: npc.questId ? (npc.questId as QuestID) : undefined,
            inventory: npc.inventory ? (npc.inventory as ItemID[]) : undefined
        });
    }

    for (const item of raw.items) {
        world.items.set(item.id as ItemID, {
            ...item,
            id: item.id as ItemID
        });
    }

    for (const quest of raw.quests) {
        world.quests.set(quest.id as QuestID, {
            ...quest,
            id: quest.id as QuestID,
            requiredItemId: quest.requiredItemId ? (quest.requiredItemId as ItemID) : undefined,
            destinationPlaceId: quest.destinationPlaceId ? (quest.destinationPlaceId as PlaceID) : undefined,
            rewardItemId: quest.rewardItemId ? (quest.rewardItemId as ItemID) : undefined
        });
    }

    return world;
}

generateWorld();