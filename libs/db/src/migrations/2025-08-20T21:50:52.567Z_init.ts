import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<any>) {
    await db.executeQuery(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.compile(db));

    await db.schema
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

    await db.executeQuery(sql`\
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'token_type_enum') THEN
                CREATE TYPE token_type_enum AS ENUM ('user', 'service');
            END IF;
        END $$;\
    `.compile(db));

    await db.schema
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

    await db.schema
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
    
    await db.schema
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
    
    await db.schema
        .createTable('game_states')
        .ifNotExists()
        .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`uuid_generate_v4()`))
        .addColumn('user_id', 'uuid', (col) => col.notNull().references('users.id').onDelete('cascade'))
        .addColumn('world_id', 'uuid', (col) => col.notNull().references('worlds.id').onDelete('cascade'))
        .addColumn('created_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
        .addColumn('updated_at', 'timestamptz', (col) => col.defaultTo(sql`NOW()`).notNull())
        .addColumn('payload', 'jsonb', (col) => col.notNull().defaultTo(sql`'{}'::jsonb`))
        .execute();
}

export async function down(db: Kysely<any>) {
    await db.schema.dropTable('game_states').ifExists().execute();
    await db.schema.dropTable('worlds').ifExists().execute();
    await db.schema.dropTable('access_tokens').ifExists().execute();
    await db.schema.dropTable('refresh_tokens').ifExists().execute();
    await db.schema.dropTable('users').ifExists().execute();

    await db.executeQuery(sql`DROP TYPE IF EXISTS token_type_enum`.compile(db));
    await db.executeQuery(sql`DROP EXTENSION IF EXISTS "uuid-ossp"`.compile(db));
}
