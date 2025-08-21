console.log("HELLO MAFAKA")
console.log(process.env.DATABASE_URL)
// Import the server module and start the server
import { startServer } from './src/server';

// Run the server
startServer();
