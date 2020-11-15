# Build the code
FROM mhart/alpine-node:8.11.4

# Set working directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Create directory for media server
RUN mkdir -p ./public/media
RUN mkdir -p ./public/thumbnail

# Copy source files
COPY ./ ./

# Install npm (Remove this line because it was crashing container build, maybe NPM does not need to be updated ?)
# RUN npm install -g npm@latest

# Install dependencies
RUN npm install

# Build the server
RUN npm run build

# Remove source files
RUN rm -rf ./src

# Start the server
CMD ["npm", "start"]
