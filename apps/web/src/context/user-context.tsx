"use client"

import type { User, TokenSet } from "@mystwright/db";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const TOKEN_SET_KEY = "mystwright_token_set";

type UserContextType = {
    user: User | null
    tokenSet: TokenSet | null
    setUser: (user: User) => void
    setTokenSet: (token_set: TokenSet | null) => void
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tokenSet, setActiveTokenSet] = useState<TokenSet | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // TODO: API Response Type
    const setTokenSet = (tokenSet: TokenSet | null): TokenSet | null => {
        if (!tokenSet) {
            localStorage.removeItem(TOKEN_SET_KEY);
            setActiveTokenSet(null);
            return null;
        }

        localStorage.setItem(TOKEN_SET_KEY, JSON.stringify(tokenSet));

        const newTokenSet: TokenSet = {
            ...tokenSet,
            access_token_expires_at: new Date(tokenSet.access_token_expires_at),
            refresh_token_expires_at: new Date(tokenSet.refresh_token_expires_at)
        };

        setActiveTokenSet(newTokenSet);
        return newTokenSet;
    }


    useEffect(() => {
        const storedTokenSet = localStorage.getItem(TOKEN_SET_KEY);

        if (storedTokenSet) {
            try {
                const parsedTokenSet = JSON.parse(storedTokenSet);
                const tokenSet = setTokenSet(parsedTokenSet);
                if (tokenSet) {
                    fetchUser(tokenSet);
                }
            } catch (error) {
                console.error("Failed to parse token set from localStorage:", error);
                localStorage.removeItem(TOKEN_SET_KEY);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async (tokenSet: TokenSet) => {
        try {
            if (tokenSet) {
                if(tokenSet.access_token_expires_at.getTime() < Date.now()) {
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
                        setTokenSet(newTokenSet);
                    } else {
                        console.error("Failed to refresh token:", res.statusText);
                        setTokenSet(null);
                    }
                }

                const res = await fetch('/api/v1/auth/profile', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${tokenSet.access_token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData.user);
                } else {
                    console.error("Failed to fetch user data:", res.statusText);
                }
            }
        } catch (error) {
            console.error("Error fetching user data:", error);
            setError("Failed to fetch user data");
        } finally {
            setLoading(false);
        }
    }

    return (
        <UserContext.Provider
            value={{
                user,
                tokenSet,
                setUser,
                setTokenSet
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export function useUserContext() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error("useUserContext must be used within a UserProvider");
    }
    return context
};
