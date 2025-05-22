import type { Generated, Insertable, JSONColumnType, Selectable, Updateable } from 'kysely';
import type { WorldPayload } from '@mystwright/types';

// Define the database schema using Kysely's type system
export interface Database {
    users: UsersTable;
    access_tokens: AccessTokensTable;
    refresh_tokens: RefreshTokensTable;
    worlds: WorldsTable;
    game_states: GameStateTable;
}

export enum TokenType {
    User = 'user',
    Service = 'service'
}

export interface AccessTokensTable {
    id: Generated<string>;
    user_id: string;
    value: string;
    refresh_token_id: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    expires_at: Date | null;
    type: TokenType;
    scopes: string[];
    properties: Record<string, any>;
}

export type DBAccessToken = Selectable<AccessTokensTable>;
export type NewAccessToken = Insertable<AccessTokensTable>;
export type AccessTokenUpdate = Updateable<AccessTokensTable>;

export interface RefreshTokensTable {
    id: Generated<string>;
    user_id: string;
    value: string;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    expires_at: Date | null;
    type: TokenType;
    scopes: string[];
    properties: Record<string, any>;
}

export type DBRefreshToken = Selectable<RefreshTokensTable>;
export type NewRefreshToken = Insertable<RefreshTokensTable>;
export type RefreshTokenUpdate = Updateable<RefreshTokensTable>;

export interface UsersTable {
    id: Generated<string>;
    email: string;
    password_hash: string;
    first_name: string | null;
    last_name: string | null;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
}

export type User = Selectable<UsersTable>;
export type SafeUser = Selectable<Omit<UsersTable, 'password_hash'>>;
export type NewUser = Insertable<UsersTable>;
export type UserUpdate = Updateable<UsersTable>;

export interface WorldsTable {
    id: Generated<string>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    user_id: string;
    title: string;
    description: string | null;
    payload: JSONColumnType<WorldPayload, WorldPayload, WorldPayload>;
};

export type DBWorld = Selectable<WorldsTable>;
export type NewWorld = Insertable<WorldsTable>;
export type WorldUpdate = Updateable<WorldsTable>;

export type GameStatePayload = Record<string, any>;

export interface GameStateTable {
    id: Generated<string>;
    created_at: Generated<Date>;
    updated_at: Generated<Date>;
    user_id: string;
    world_id: string;
    payload: JSONColumnType<GameStatePayload, GameStatePayload, GameStatePayload>;
};

export type DBGameState = Selectable<GameStateTable>;
export type NewGameState = Insertable<GameStateTable>;
export type GameStateUpdate = Updateable<GameStateTable>;