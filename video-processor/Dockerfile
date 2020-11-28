# Build the code
FROM mhart/alpine-node:8.11.4

# Set working directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Copy source files
COPY ./video-processor ./
COPY ./.env ./

# Install npm
# Could not install npm before, so added this line to fix
# ref: https://stackoverflow.com/questions/52196518/could-not-get-uid-gid-when-building-node-docker
RUN npm config set unsafe-perm true
RUN npm install -g npm@latest

# Install dependencies
# TODO: Maybe you should clean that mess ?
RUN npm i mongodb@~3.6.0
RUN npm i dotenv@~8.2.0
RUN npm i amqplib@~0.6.0
RUN npm i simple-thumbnail@~1.6.5
RUN npm i ffmpeg-static@~4.0.1

# Start the server
CMD ["node", "videoProcessor.js"]
