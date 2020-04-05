# Use a lighter version of Node as a parent image
FROM mhart/alpine-node:8.11.4

# Set the working directory to /api
WORKDIR /api

# copy package.json into the container at /api
COPY package*.json ./

# install dependencies
RUN npm install npm -g
RUN npm install

# Copy the current directory contents into the container at /api
COPY . .

# Make our app port inside the app
EXPOSE 9000:9000

# Run the app when the container launches
CMD ["npm", "start"]
