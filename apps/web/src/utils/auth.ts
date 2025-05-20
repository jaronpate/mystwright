import { TokenSet } from "@mystwright/db";

export const TOKEN_SET_KEY = "mystwright_token_set";

export type LocalTokenSet = Omit<TokenSet, 'expires_at'> & { expires_at: Date };

export function getTokenSet(): LocalTokenSet | null {
    if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(TOKEN_SET_KEY);

        if (raw === null) {
            return null;
        }
        
        try {
            const tokenSet = JSON.parse(raw);

            if (tokenSet && tokenSet.access_token) {
                return {
                    ...tokenSet,
                    expires_at: new Date(tokenSet.expires_at)
                };
            }
        } catch (error) {
            console.error("Failed to parse token set from localStorage:", error);
            localStorage.removeItem(TOKEN_SET_KEY);
        }

        return null;
    }
    return null;
}

export function getToken(): string | null {
    const tokenSet = getTokenSet();
    return tokenSet ? tokenSet.access_token : null;
}