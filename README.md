<div align="center">
    <img src="icon.png" alt="Mystwright Logo" width="100"/>
    <h1>Mystwright</h1>
</div>

<!-- # Mystwright -->

Mystwright is an interactive text-based mystery game with voice capabilities, built using TypeScript, React (via Ink), and AI-powered interactions.

## Features

- Interactive mystery adventures with configurable scenarios
- Character conversations with AI-powered dialogue
- Voice synthesis through ElevenLabs integration
- Terminal-based UI with React/Ink
- Web-based UI with React
- Clue collection and mystery solving mechanics

## Requirements

- Bun runtime
- OpenRouter API key for AI interactions
- ElevenLabs API key for voice synthesis

## Installation

```bash
# Clone the repository
git clone https://github.com/jaronpate/mystwright.git
cd mystwright

# Install dependencies
bun install
```

## Environment Setup

Create environment variables for API keys (bun will auto inject a root `.env` file):

```bash
export OPENROUTER_API_KEY="your_openrouter_api_key"
export ELEVENLABS_API_KEY="your_elevenlabs_api_key"
```

## Running the Game

### Terminal UI
```bash
bun run index.ts
```

## Game Commands

- `/help` - Show available commands
- `/talkto [character]` - Talk to a character
- `/solve [solution]` - Attempt to solve the mystery
- `/leave` - Leave the current conversation
- `/clear` - Clear the chat history
- Type messages to interact with characters during conversations

## Technology

- TypeScript
- Bun (JavaScript runtime)
- Ink (React for terminal applications)
- React (Web UI)
- Vite (Build tooling for Web UI)
- OpenRouter API for AI interactions
- ElevenLabs for voice synthesis

---

This project is a work in progress and just a fun hibby for now. Contributions and feedback are welcome!
