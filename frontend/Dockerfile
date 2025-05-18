# Base image
FROM node:20-alpine

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies first
RUN pnpm install --frozen-lockfile

# Copy the rest of the application (node_modules excluded by .dockerignore)
COPY . .

# Build the Next.js app
RUN pnpm build

# Set environment to production
ENV NODE_ENV production
ENV HOSTNAME "0.0.0.0"

# Expose port
EXPOSE 3000

# Start the app
CMD ["pnpm", "start"]