FROM debian:stable-slim

ENV HOME /ripplet

ENV USER_ID 1000
ENV GROUP_ID 1000

RUN groupadd -g ${GROUP_ID} ripplet \
  && useradd -u ${USER_ID} -g ripplet -s /bin/bash -m -d /ripplet ripplet \
  && set -x \
  && apt-get update -y \
  && apt-get install -y curl gosu \
  && apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - \
  && apt-get install -y nodejs

ENV YARN_VERSION 1.9.4

RUN npm install yarn -g

ADD ./bin /usr/local/bin
RUN chmod +x /usr/local/bin/xrp_oneshot

VOLUME ["/ripplet"]

COPY package*.json /ripplet/

RUN yarn install

EXPOSE 8899

COPY . /ripplet/

WORKDIR /ripplet

COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD [ "xrp_oneshot" ]