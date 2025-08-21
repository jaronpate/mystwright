# Use the official Bun image as a base
FROM oven/bun:latest AS builder

# Set the working directory to the root of the project
WORKDIR /usr/mystwright

# Copy the parent directory contents into the container at /usr/mystwright
COPY . .

# Set environment variables
ARG MODE
ARG GITHUB_SHA
ARG GITHUB_REF

ENV VITE_MODE=$MODE
ENV NODE_ENV=$MODE
ENV VITE_GITHUB_SHA=$GITHUB_SHA
ENV VITE_GITHUB_REF=$GITHUB_REF

# Move into the api directory
WORKDIR /usr/mystwright/apps/web

# Install dependencies using Bun
RUN bun install

# Build the dashboard app
RUN bun run build -- --mode $VITE_MODE

# Use an Nginx image to serve the built dashboard
FROM nginx:alpine

EXPOSE 80

COPY ./apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /usr/mystwright/apps/web/dist /usr/share/nginx/html