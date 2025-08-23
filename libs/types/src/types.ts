export type Brand<T, K> = T & { __brand: K };
export type ID = Brand<string, 'UUID'>;
export type ClueID = Brand<string, 'clue'>;
export type CharacterID = Brand<string, 'character'>;
export type LocationID = Brand<string, 'location'>;

export interface Mystery {
    title: string;
    description: string;
    victim: string;
    crime: string;
    time: string;
    location: string;
}

export interface Location {
    id: LocationID;
    name: string;
    description: string;
    connectedLocations: string[]; // like Place connections
    clues: string[];              // Clues present here
    characters: string[];         // IDs of characters found here
}

export interface Character {
    id: CharacterID;
    name: string;
    description: string;
    personality: string;
    voice: string;
    role: 'suspect' | 'witness' | 'victim';
    image?: string; // URL to character image
    alibi?: string;
    knownClues?: ClueID[];         // IDs of clues they know about
}

export interface Clue {
    id: ClueID;
    name: string;
    description: string;
    type: 'physical' | 'testimony' | "other";
    image?: string; // URL to clue image
}

export interface Solutuion {
    culpritId: CharacterID;
    motive: string;
    method: string;
}

export interface World {
    locations: Map<LocationID, Location>
    characters: Map<CharacterID, Character>
    clues: Map<ClueID, Clue>;
    mystery: Mystery;
    solution: Solutuion;
}
export type Message = {
    role: 'system' | 'user' | 'assistant'
    content: string;
};

export type MessageUI = Message & { sender?: string; };

export type WorldPayload = {
    locations: Location[];
    characters: Character[];
    clues: Clue[];
    mystery: Mystery;
    solution: Solutuion;
};

export type OpenRouterChatCompletionResponse = {
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

export type Memory = {
    origin_id: string;
    origin_type: 'location' | 'character' | 'clue';
    content: string;
}

export type GameState = {
    currentLocation: LocationID | null;
    currentCharacter: CharacterID | null;
    cluesFound: ClueID[];
    solved: boolean;
    isInConversation: boolean;
    isSolving: boolean;
    memories: Memory[];
    dialogueHistory: Record<CharacterID, Message[]>;
};

export type Tool = {
    type: 'function' | 'action';
    name: string;
    description: string;
    when: string;
    parameters: Record<string, any>;
    handler: (args: any) => Promise<any>;
};