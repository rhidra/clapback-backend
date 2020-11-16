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

# Install npm
# Could not install npm before, so added this line to fix
# ref: https://stackoverflow.com/questions/52196518/could-not-get-uid-gid-when-building-node-docker
RUN npm config set unsafe-perm true
RUN npm install -g npm@latest

# Install dependencies
RUN npm install

# Build the server
RUN npm run build

# Remove source files
RUN rm -rf ./src

# Start the server
CMD ["npm", "start"]
