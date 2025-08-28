export type Brand<T, K> = T & { __brand: K };
export type ID = Brand<string, 'UUID'>;
export type ClueID = Brand<string, 'clue'>;
export type CharacterID = Brand<string, 'character'>;
export type LocationID = Brand<string, 'location'>;

export interface Mystery {
    title: string;
    description: string;
    shortDescription: string;
    victim: string;
    crime: string;
    time: string;
    location_id: LocationID;
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

export type ValidationErrorType = 
    | 'MISSING_STRUCTURE'
    | 'INSUFFICIENT_COUNT'
    | 'INVALID_REFERENCE'
    | 'MISSING_CULPRIT'
    | 'INVALID_DATA';

export interface ValidationError {
    type: ValidationErrorType;
    message: string;
    field?: string;
    expected?: string | number;
    actual?: string | number;
    suggestion?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export class WorldValidationError extends Error {
    public readonly validationResult: ValidationResult;
    public readonly worldPayload: WorldPayload;

    constructor(validationResult: ValidationResult, worldPayload: WorldPayload, message?: string) {
        const errorMessage = message || `World validation failed: ${validationResult.errors.map(e => e.message).join('; ')}`;
        super(errorMessage);
        
        this.name = 'WorldValidationError';
        this.validationResult = validationResult;
        this.worldPayload = worldPayload;
        
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, WorldValidationError);
        }
    }

    /**
     * Get errors of a specific type
     */
    getErrorsByType(type: ValidationErrorType): ValidationError[] {
        return this.validationResult.errors.filter(error => error.type === type);
    }

    /**
     * Check if validation result contains errors of a specific type
     */
    hasErrorType(type: ValidationErrorType): boolean {
        return this.validationResult.errors.some(error => error.type === type);
    }

    /**
     * Get a formatted error message for display
     */
    getFormattedErrorMessage(): string {
        return this.validationResult.errors
            .map(error => `[${error.type}] ${error.message}${error.suggestion ? ` (${error.suggestion})` : ''}`)
            .join('\n');
    }
}
