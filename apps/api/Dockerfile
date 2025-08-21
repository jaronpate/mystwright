# Use the official Bun image as a base
# ---- Build Stage ----
FROM oven/bun:latest as builder

# Set the working directory to the root of the project
WORKDIR /usr/mystwright

# Copy the parent directory contents into the container at /usr/mystwright
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Install dependencies using Bun
RUN bun install

RUN bun build apps/api/index.ts --outfile=apps/api/dist/server --target=bun --compile --external=aws-sdk --external=mock-aws-s3 --external=nock

# ---- Final Stage ----
FROM nginx:alpine

EXPOSE 80

# Copy nginx config
COPY ./apps/api/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /apps/api/dist/server /server

CMD /bin/sh -c "/server & nginx -g 'daemon off;'"