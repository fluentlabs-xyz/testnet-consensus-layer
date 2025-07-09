# Use official Node.js base image
FROM node:18-alpine

# Set environment variables
ENV APP_DIR=/app
WORKDIR $APP_DIR

ARG BLOCK_HASH_ORACLE_URL
ARG ENGINE_API_URL
ARG JWT_SECRET_PATH

# Install PM2 globally
RUN npm install -g pm2

# Copy app files
COPY package.json ./
COPY yarn.lock ./
RUN yarn
COPY index.js ./

# Use PM2 to run the app
CMD ["pm2-runtime", "start", "index.js", "--name", "testnet-consensus-layer"]