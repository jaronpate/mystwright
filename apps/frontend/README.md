# Mystwright React Frontend

This is a React-based web frontend for the Mystwright text adventure game. It provides feature parity with the terminal-based UI.

## Features

- Modern, responsive web interface
- Chat-based interaction with characters
- Visual display of game information
- Command system for interacting with the game
- Text-to-speech support (when enabled)
- SCSS styling with variables and mixins

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Open your browser to the URL displayed in the terminal (usually http://localhost:5173)

## Available Commands

The following commands are available in the game:

- `/help`: Show the help message
- `/clear`: Clear the chat history
- `/leave`: Leave the current conversation
- `/talkto <character>`: Start a conversation with a character
- `/solve <solution>`: Attempt to solve the mystery

## Project Structure

- `src/components/`: React components for the UI
- `src/styles/`: SCSS styles
  - `_variables.scss`: Global variables
  - `_mixins.scss`: Reusable mixins
  - Component-specific styles
- `src/types.ts`: TypeScript definitions (shared with the main app)
- `src/api.ts`: API client for backend communication
- `src/constants.ts`: Shared constants with the main app

## Building for Production

To build the app for production:

```bash
npm run build
# or
yarn build
```

The built files will be in the `dist` directory.