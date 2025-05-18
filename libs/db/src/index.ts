import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import { config, type DBConfig } from './config';
import { type Database } from './schema';

// Re-export schema and types
export { sql } from 'kysely';
export * from './config';
export * from './schema';
export * from './models';

/**
 * Creates a new Kysely database instance
 */
export function createDb(config: DBConfig): Kysely<Database> {
    return new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: new pg.Pool({
                password: config.DB_PASS,
                user: config.DB_USER,
                host: config.DB_HOST,
                port: config.DB_PORT,
                database: config.DB_NAME,
                connectionTimeoutMillis: 10000,
                max: config.MAX_CONNECTIONS || 10,
            }),
        }),
    });
}

// Default db instance using default config
export const db = createDb(config);

/**
 * Function to initialize the database schema
 */
export async function initializeDb(database = db): Promise<void> {
    // Number of retries and delay between retries
    const maxRetries = 5;
    const retryDelayMs = 3000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Database initialization attempt ${attempt}/${maxRetries}`);
            await database.executeQuery(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.compile(database));

            await database.schema
                .createTable('users')
                .ifNotExists()
                .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
                .addColumn('email', 'text', (col) => col.notNull().unique())
                .addColumn('password_hash', 'text', (col) => col.notNull())
                .addColumn('first_name', 'text', (col) => col.notNull())
                .addColumn('last_name', 'text')
                .addColumn('created_at', 'timestamptz', (col) =>
                    col.defaultTo(sql`NOW()`).notNull()
                )
                .addColumn('updated_at', 'timestamptz', (col) =>
                    col.defaultTo(sql`NOW()`).notNull()
                )
                .execute();

            await database.executeQuery(sql`\
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'token_type_enum') THEN
                        CREATE TYPE token_type_enum AS ENUM ('user', 'service');
                    END IF;
                END $$;\
            `.compile(database));

            await database.schema
                .createTable('refresh_tokens')
                .ifNotExists()
                .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
                .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
                .addColumn('value', 'text', (col) => col.notNull())
                .addColumn('created_at', 'timestamptz', (col) =>
                    col.defaultTo(sql`NOW()`).notNull()
                )
                .addColumn('updated_at', 'timestamptz', (col) =>
                    col.defaultTo(sql`NOW()`).notNull()
                )
                .addColumn('expires_at', 'timestamptz')
                .addColumn('type', sql`token_type_enum`, (col) => col.notNull())
                .addColumn('scopes', sql`text[]`, (col) => col.notNull().defaultTo(sql`ARRAY[]::text[]`))
                .addColumn('properties', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
                .execute();

            await database.schema
                .createTable('access_tokens')
                .ifNotExists()
                .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
                .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
                .addColumn('refresh_token_id', 'uuid', (col) => col.references('refresh_tokens.id').onDelete('cascade'))
                .addColumn('value', 'text', (col) => col.notNull())
                .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('expires_at', 'timestamptz')
                .addColumn('type', sql`token_type_enum`, (col) => col.notNull())
                .addColumn('scopes', sql`text[]`, (col) => col.notNull().defaultTo(sql`ARRAY[]::text[]`))
                .addColumn('properties', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
                .execute();
            
            await database.schema
                .createTable('worlds')
                .ifNotExists()
                .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
                .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
                .addColumn('title', 'text', (col) => col.notNull())
                .addColumn('description', 'text', (col) => col.notNull())
                .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('payload', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
                .execute();
            
            await database.schema
                .createTable('game_states')
                .ifNotExists()
                .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
                .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
                .addColumn('world_id', 'uuid', (col) => col.notNull().references('worlds.id').onDelete('cascade'))
                .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
                .addColumn('payload', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
                .execute();

            console.log('Database schema initialized successfully');
            return;
        } catch (error) {
            console.error(`Database initialization attempt ${attempt} failed:`, error);
            
            if (attempt < maxRetries) {
                console.log(`Retrying in ${retryDelayMs/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            } else {
                console.error(`All ${maxRetries} initialization attempts failed`);
                // @ts-ignore - annoying
                throw new Error(`Failed to initialize database after ${maxRetries} attempts: ${error?.message}`);
            }
        }
    }
}