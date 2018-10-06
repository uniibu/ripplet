FROM node:10.11-slim

WORKDIR /ripplet

VOLUME ["/ripplet"]

COPY package.json ./
COPY yarn.lock ./

RUN yarn
COPY . .

EXPOSE 8899

CMD [ "yarn", "start" ]