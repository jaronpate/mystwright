# Use the official Bun image as a base
FROM oven/bun:latest

# Set the working directory to the root of the project
WORKDIR /usr/mystwright

# Copy the parent directory contents into the container at /usr/mystwright
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Move into the api directory
WORKDIR /usr/mystwright/services/api

# Install dependencies using Bun
RUN bun install

EXPOSE 3030 

# Start the application
CMD ["bun", "run", "start"]
