// Import the server module and start the server
import { startServer } from './src/server';

// Run the server
startServer('0.0.0.0');
startServer('::'); // For IPv6 support
