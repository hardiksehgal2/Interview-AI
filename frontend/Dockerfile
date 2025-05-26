# Dockerfile for Static Next.js Frontend

# Stage 1: Build Stage
FROM node:20 AS builder

# Set the working directory inside the builder container
WORKDIR /app

# ---- START: Added for build-time ENV VARS ----
# Declare ARG that can be passed during docker build (and thus Cloud Build)
ARG NEXT_PUBLIC_API_BASE_URL
# Set ENV var from ARG so npm run build can access it
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
# ---- END: Added for build-time ENV VARS ----

# Copy package.json and package-lock.json to install dependencies
COPY ./package*.json ./

# Install dependencies and the latest version of npm
RUN npm install -g npm@latest && npm install

# Copy the entire frontend code to the builder container
COPY ./ ./

# Build the Next.js project (this will also run 'next export' due to your next.config.js)
RUN npm run build

# Stage 2: Production Stage
FROM node:20-slim AS runner

# Set the working directory inside the production container
WORKDIR /app

# Install only `serve` for serving the built application
RUN npm install -g serve

# Copy the built output from the builder stage
COPY --from=builder /app/out ./out

# This ENV PORT will be overridden by Cloud Run's injected PORT, which is fine
# ENV PORT=3000
# EXPOSE $PORT # EXPOSE is more for documentation; Cloud Run uses the PORT env var the app listens on

# Start the application using serve, listening on the port specified by Cloud Run's PORT env var
CMD sh -c "serve out -l $PORT"