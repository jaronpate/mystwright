import { serve } from 'bun';
import { routes } from './routes';
import { config } from './config';
import { initializeDb } from './db';

/**
 * Start the server
 */
async function startServer(hostname: string = '0.0.0.0') {
    try {
        // Initialize the database with required tables
        await initializeDb();
        console.log('Database initialized successfully');
        
        // Start the server
        const server = serve({
            port: config.PORT,
            hostname,
            idleTimeout: 0,
            routes,
        });

        console.log(`Server running on http://${server.hostname}:${server.port}`);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Export for testing or programmatic usage
export { startServer };