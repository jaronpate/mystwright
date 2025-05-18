/**
 * Database configuration
 */
export interface DBConfig {
    DB_PASS: string;
    DB_USER: string;
    DB_HOST: string;
    DB_PORT: number;
    DB_NAME: string;
    MAX_CONNECTIONS?: number;
}

export const config = {
    // Database
    DB_PASS: process.env.DB_PASS || 'postgres',
    DB_USER: process.env.DB_USER || 'postgres',
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: Number(process.env.DB_PORT || 5432),
    DB_NAME: process.env.DB_NAME || 'mystwright',
    MAX_CONNECTIONS: Number(process.env.MAX_CONNECTIONS || 10),
};