FROM node:10.11-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn
COPY . .

EXPOSE 8899

CMD [ "yarn", "start" ]