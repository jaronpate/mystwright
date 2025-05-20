import { useUserContext } from '../context/user-context';

export function useApi() {
    const { tokenSet, setTokenSet } = useUserContext();

    return async function apiFetch<T>(
        input: RequestInfo,
        init?: RequestInit,
    ): Promise<T> {
        if (!tokenSet) {
            throw new Error('No token set found');
        }

        let validTokenSet = tokenSet;

        if (tokenSet.expires_at && tokenSet.expires_at < new Date()) {
            const res = await fetch('/api/v1/auth/token', {
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

        const response = await fetch(input, {
            ...init,
            headers,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API error: ${response.status} ${text}`);
        }

        return response.json();
    }
}