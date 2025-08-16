FROM node:alpine AS development

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build only the producer-service app
RUN npx nest build producer-service


FROM node:alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Install only production dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy source (for runtime assets like .env resolution and package metadata)
COPY . .

# Copy built dist from development stage
COPY --from=development /usr/src/app/dist ./dist

# Service port
EXPOSE 3001

# Start the producer service
CMD ["node", "dist/apps/producer-service/main"]


