import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { config, type DBConfig } from './config';
import { migrateToLatest } from './migrate';
import { type Database } from './schema';
// Re-export schema and types
export { sql } from 'kysely';
export * from './config';
export * from './models';
export * from './schema';

/**
 * Creates a new Kysely database instance
 */
export function createDb(config: DBConfig): Kysely<Database> {
    const connectionConfig = {
        connectionTimeoutMillis: 10000, // 10 seconds
        max: config.MAX_CONNECTIONS || 10, // Default to 10 connections
    } as pg.PoolConfig;
    
    if (process.env.DATABASE_URL) {
        // Use DATABASE_URL if available
        connectionConfig.connectionString = process.env.DATABASE_URL;
    } else {
        // Otherwise, use individual config options
        connectionConfig.password = config.DB_PASS;
        connectionConfig.user = config.DB_USER;
        connectionConfig.host = config.DB_HOST;
        connectionConfig.port = config.DB_PORT;
        connectionConfig.database = config.DB_NAME;
    }

    return new Kysely<Database>({
        dialect: new PostgresDialect({
            pool: new pg.Pool(connectionConfig),
        }),
    });
}

// Default db instance using default config
export const db = createDb(config);

export const cleanup = async () => {
    console.log('Shutting down database connection pool...');
    await db.destroy();
    console.log('Database connection pool shut down complete.');
};

/**
 * Function to initialize the database schema with exponential backoff
 */
export async function initializeDb(
    database = db,
    options: {
        maxRetries?: number; // undefined means infinite retries
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
    } = {}
): Promise<typeof cleanup> {
    const {
        maxRetries, // undefined by default for infinite retries
        initialDelayMs = 1000,
        maxDelayMs = 30000,
        backoffMultiplier = 2
    } = options;

    let attempt = 1;
    let currentDelayMs = initialDelayMs;

    while (true) {
        try {
            if (maxRetries !== undefined) {
                console.log(`Database initialization attempt ${attempt}/${maxRetries}`);
            } else {
                console.log(`Database initialization attempt ${attempt}`);
            }

            await migrateToLatest(database);

            console.log('Database schema initialized successfully');
            return cleanup;
        } catch (error) {
            // @ts-ignore - bad error type
            console.log(`Database initialization attempt ${attempt} failed: ${error?.message ?? error}`);

            // Check if we've exceeded max retries (if specified)
            if (maxRetries !== undefined && attempt >= maxRetries) {
                console.error(`All ${maxRetries} initialization attempts failed`);
                console.log(`Failed to initialize database after ${maxRetries} attempts`);
                // @ts-ignore - bad error type
                throw new Error(`Failed to initialize database after ${maxRetries} attempts: ${error?.message ?? error}`);
            }

            console.log(`Retrying database initialization in ${currentDelayMs / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, currentDelayMs));

            // Exponential backoff with max delay cap
            currentDelayMs = Math.min(currentDelayMs * backoffMultiplier, maxDelayMs);
            attempt++;
        }
    }
}
