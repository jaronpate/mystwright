<div align="center">
    <img src="icon.png" alt="Mystwright Logo" width="100"/>
    <h1>Mystwright</h1>
</div>

<!-- # Mystwright -->

Mystwright is an interactive text-based mystery game with voice capabilities, built using TypeScript, React, and AI-powered interactions.

## Features

- Interactive mystery scenarios generated on-the-fly
- Character conversations with AI-powered dialogue
- Voice synthesis through ElevenLabs integration
- Clue collection and mystery solving mechanics
- Web-based UI (React + Vite)

## Requirements

- Bun runtime
- OpenRouter API key for AI interactions
- ElevenLabs API key for voice synthesis
- Replicate API token for image generation
- S3-compatible storage for saving assets

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
export OPENROUTER_API_KEY='your_openrouter_api_key'
export ELEVENLABS_API_KEY='your_elevenlabs_api_key'
export REPLICATE_API_TOKEN='your_replicate_api_token'

export S3_ACCESS_KEY_ID='your_s3_access_key_id'
export S3_SECRET_ACCESS_KEY='your_s3_secret_access_key'
export S3_ENDPOINT='your_s3_endpoint_url'
export S3_BUCKET_NAME='your_s3_bucket_name'
```

## Running the Game

### Web
```bash
bun run-web
```

### API
```bash
bun run-api
```

## Technology

- TypeScript
- Bun (JavaScript runtime)
- React (Web UI)
- Vite (Build tooling for Web UI)
- OpenRouter API for AI interactions
- ElevenLabs for voice synthesis
- Replicate for image generation

---

This project is a work in progress and just a fun hobby for now. Contributions and feedback are welcome!
