FROM node:10.11-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN yarn
COPY . .
RUN chmod +x bin/ripplet-cli && ln -s bin/ripplet-cli /usr/bin/
EXPOSE 8899

CMD [ "yarn", "start" ]