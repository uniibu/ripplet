FROM node:16-slim

WORKDIR /usr/src/app

COPY package*.json ./
COPY yarn.lock ./

RUN npm install pm2 -g && yarn install --prod
COPY . .
RUN chmod +x /usr/src/app/bin/ripplet-cli && ln -s /usr/src/app/bin/ripplet-cli /usr/bin/
EXPOSE 8899

CMD [ "pm2-runtime", "ecosystem.config.js" ]