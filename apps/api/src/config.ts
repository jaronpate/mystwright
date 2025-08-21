/**
 * Environment configuration
 */
export const config = {
    // Server settings
    PORT: Number(process.env.PORT ?? 3030), // Default to 3030 if PORT is not set
    
    // Environment
    NODE_ENV: process.env.NODE_ENV ?? 'development',

    // Authentication
    JWT_SECRET: process.env.JWT_SECRET ?? 'your_jwt_secret_key_change_in_production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '1Y',
    
    // Add other configuration as needed
    LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
};

/**
 * Helper to determine if running in production
 */
export const isProd = config.NODE_ENV === 'production';