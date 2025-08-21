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

export function setTokenSet(tokenSet: TokenSet): void {
    localStorage.setItem(TOKEN_SET_KEY, JSON.stringify(tokenSet));
}

export function clearTokenSet(): void {
    localStorage.removeItem(TOKEN_SET_KEY);
}

export function isTokenValid(tokenSet: LocalTokenSet | null): boolean {
    if (!tokenSet) return false;
    return tokenSet.expires_at > new Date();
}

export async function login(email: string, password: string): Promise<{ user: any; tokenSet: TokenSet } | { error: string }> {
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
            const data = await response.json();
            setTokenSet(data);
            return { user: data.user, tokenSet: data };
        } else {
            const errorData = await response.json();
            return { error: errorData.error || 'Login failed' };
        }
    } catch (error) {
        return { error: 'An error occurred during login' };
    }
}

export async function signup(
    email: string, 
    password: string, 
    firstName: string, 
    lastName?: string
): Promise<{ user: any; tokenSet: TokenSet } | { error: string }> {
    try {
        const response = await fetch('/api/v1/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                email, 
                password, 
                first_name: firstName,
                last_name: lastName || null
            }),
        });

        if (response.ok) {
            const data = await response.json();
            setTokenSet(data);
            return { user: data.user, tokenSet: data };
        } else {
            const errorData = await response.json();
            return { error: errorData.error || 'Signup failed' };
        }
    } catch (error) {
        return { error: 'An error occurred during signup' };
    }
}

export async function refreshToken(refreshToken: string): Promise<TokenSet | null> {
    try {
        const response = await fetch('/api/v1/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh_token: refreshToken,
                grant_type: "refresh_token"
            })
        });

        if (response.ok) {
            const newTokenSet = await response.json();
            setTokenSet(newTokenSet);
            return newTokenSet;
        } else {
            console.error("Failed to refresh token:", response.statusText);
            clearTokenSet();
            return null;
        }
    } catch (error) {
        console.error("Error refreshing token:", error);
        clearTokenSet();
        return null;
    }
}

export async function fetchUserProfile(accessToken: string): Promise<any | null> {
    try {
        const response = await fetch('/api/v1/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const userData = await response.json();
            return userData.user;
        } else {
            console.error("Failed to fetch user data:", response.statusText);
            return null;
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

export function logout(): void {
    clearTokenSet();
}
