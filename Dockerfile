FROM mhart/alpine-node:8.11.4

RUN mkdir -p /usr/app
WORKDIR /usr/app

COPY ./ ./
RUN npm install -g npm@latest
RUN mkdir -p /public/media
RUN mkdir -p /public/thumbnail

RUN npm install
CMD ["npm", "start"]
