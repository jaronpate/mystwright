import { serve } from 'bun';
import { routes } from './routes';
import { config } from './config';
import { initializeDb } from './db';

/**
 * Start the server
 */
async function startServer() {
    try {
        // Initialize the database with required tables
        await initializeDb();
        console.log('Database initialized successfully');
        
        // Start the server
        serve({
            port: config.PORT,
            routes,
        });

        console.log(`Server running on http://localhost:${config.PORT}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server if this file is run directly
if (import.meta.path === Bun.main) {
    startServer();
}

// Export for testing or programmatic usage
export { startServer };