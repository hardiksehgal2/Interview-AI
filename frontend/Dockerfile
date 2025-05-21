# Stage 1: Build Stage
FROM node:20 AS builder

# Set the working directory inside the builder container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies
COPY ./package*.json ./

# Install dependencies and the latest version of npm
RUN npm install -g npm@latest && npm install

# Copy the entire frontend code to the builder container
COPY ./ ./

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build the Next.js project for Static Site Generation (SSG)
RUN npm run build

# Stage 2: Production Stage
FROM node:20-slim AS runner

# Set the working directory inside the production container
WORKDIR /app

# Install only `serve` for serving the built application
RUN npm install -g serve

# Copy the built output from the builder stage
COPY --from=builder /app/out ./out

# Set environment variables
ENV PORT=3000

# Expose port for HTTP traffic
EXPOSE $PORT

# Start the application using serve
CMD sh -c "serve out -l $PORT"