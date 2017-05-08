FROM ubuntu:trusty

COPY ./misc/ /app/misc/
COPY ./package.json /app/
COPY ./server/ /app/server/
COPY ./src/views/ /app/src/views/
COPY ./sqlite/ /app/sqlite/
COPY ./tmp/ /app/tmp/
COPY ./translations/ /app/translations/
COPY ./views/ /app/views/

WORKDIR /app

RUN mkdir /app/logs
RUN apt-get update
RUN apt-get install -y software-properties-common curl
RUN curl -sL https://deb.nodesource.com/setup_7.x | sudo -E bash -
RUN add-apt-repository ppa:mc3man/trusty-media -y
RUN apt-get update
RUN apt-get install -y ffmpeg \
  libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++ \
  graphicsmagick \
  cimg-dev libphash0-dev libmagickcore-dev \
  nodejs \
  git
RUN npm i

EXPOSE 8080

CMD npm run start
