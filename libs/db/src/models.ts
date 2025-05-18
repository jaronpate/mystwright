import { TokenType, type DBAccessToken, type DBRefreshToken } from './schema';

export type TokenSet = {
    access_token: string;
    refresh_token: string;
    access_token_expires_at: Date;
    refresh_token_expires_at: Date;
}

export class Token {
    id: string;
    created_at: Date;
    updated_at: Date;
    user_id: string;
    value: string;
    type: TokenType;
    expires_at: Date | null;
    scopes: string[];
    properties: Record<string, any>;

    constructor(token: DBAccessToken | DBRefreshToken) {
        this.id = token.id;
        this.created_at = token.created_at;
        this.updated_at = token.updated_at;
        this.user_id = token.user_id;
        this.value = token.value;
        this.type = token.type;
        this.expires_at = token.expires_at;
        this.scopes = token.scopes;
        this.properties = token.properties;
    }

    static fromDB(token: DBAccessToken | DBRefreshToken): Token {
        return new Token(token);
    }

    static fromDBArray(tokens: (DBAccessToken | DBRefreshToken)[]): Token[] {
        return tokens.map(token => new Token(token));
    }
}