# Use the official Bun image as a base
FROM oven/bun:latest

# Set the working directory to the root of the project
WORKDIR /usr/mystwright

# Copy the parent directory contents into the container at /usr/mystwright
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Install dependencies using Bun
RUN bun install

RUN bun build apps/api/index.ts --outdir=apps/api/dist --target=bun --external=aws-sdk --external=mock-aws-s3 --external=nock

EXPOSE 3030 

# Start the application
CMD ["bun", "run", "apps/api/dist/index.js"]
