# Build the code
FROM mhart/alpine-node:15.2.1

# Set working directory
RUN mkdir -p /usr/app
WORKDIR /usr/app

# Copy source files
COPY ./video-processor ./
COPY ./.env ./

# Update NPM
# We cannot update npm with npm, so we use yarn ....
RUN yarn global add npm@7.0.15

# Install dependencies
# TODO: Maybe you should clean that mess ?
RUN npm i mongodb@~3.6.0
RUN npm i dotenv@~8.2.0
RUN npm i amqplib@~0.6.0
RUN npm i simple-thumbnail@~1.6.5
RUN npm i ffmpeg-static@~4.0.1

# Start the server
CMD ["node", "videoProcessor.js"]
