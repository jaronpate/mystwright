import { useUserContext } from '../context/user-context';

export const baseURL = import.meta.env.PROD ? `https://api.${window.location.host}` : 'http://localhost:3030';

export function useApi() {
    const { tokenSet, setTokenSet } = useUserContext();

    return async function apiFetch<T, K extends boolean = false>(
        input: RequestInfo,
        init?: RequestInit,
        raw?: K
    ): Promise<K extends true ? Response : T> {
        if (!tokenSet) {
            throw new Error('No token set found');
        }

        let validTokenSet = tokenSet;


        if (tokenSet.expires_at && tokenSet.expires_at < new Date()) {
            const res = await fetch(`${baseURL}/api/v1/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    refresh_token: tokenSet.refresh_token,
                    grant_type: "refresh_token"
                })
            });

            if (res.ok) {
                const newTokenSet = await res.json();
                const formatted = setTokenSet(newTokenSet);
                if (formatted) {
                    validTokenSet = formatted;
                } else {
                    console.error("Failed to format token set:", newTokenSet);
                    throw new Error("Failed to format token set");
                }
            } else {
                console.error("Failed to refresh token:", res.statusText);
                setTokenSet(null);
            }
        }

        const headers = new Headers(init?.headers || {});
        headers.set('Authorization', `Bearer ${validTokenSet.access_token}`);

        const response = await fetch(`${baseURL}${input}`, {
            ...init,
            headers,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error: ${response.status} ${text}`);
        }

        if (raw) {
            return response as K extends true ? Response : T;
        } else {
            return response.json() as K extends true ? Response : T;
        }
    }
}