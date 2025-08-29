import type { CharacterID } from "./types";

export const JUDGE_CHARACTER_ID = 'judge' as const as CharacterID;
export const JUDGE_VOICE_ID = '6sFKzaJr574YWVu4UuJF' as const;
export const JUDGE_VOICE = 'Cornelius' as const;

// Some options im considering for the default weak model - currently used in all requests even world gen;
// Not sure where a "strong" model would be used yet

// export const DEFAULT_WEAK_MODEL = 'google/gemini-2.5-flash-lite' as const;
// export const DEFAULT_WEAK_MODEL = 'google/gemini-2.5-flash' as const;
export const DEFAULT_WEAK_MODEL = 'google/gemini-2.0-flash-001' as const;
// export const DEFAULT_WEAK_MODEL = 'deepseek/deepseek-chat-v3-0324' as const;

export const DEFAULT_IMAGE_MODEL = 'google/imagen-4-ultra' as const;