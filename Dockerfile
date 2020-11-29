# Build the code
FROM mhart/alpine-node:15.2.1

# Set working directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Create directory for media server
RUN mkdir -p ./public/mp4
RUN mkdir -p ./public/hls
RUN mkdir -p ./public/thumbnail

# Copy source files
COPY ./ ./

# Update NPM
# We cannot update npm with npm, so we use yarn ....
RUN yarn global add npm@7.0.15

# Install dependencies
RUN npm install

# Build the server
RUN npm run build

# Remove source files
RUN rm -rf ./src

# Start the server
CMD ["npm", "start"]
