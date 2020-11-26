FROM ubuntu:20.04

COPY . /opt/app/

WORKDIR /opt/app

RUN apt update \
  && apt upgrade --assume-yes \
  && DEBIAN_FRONTEND="noninteractive" TZ="US/Eastern" apt install --assume-yes \
    git \
    nodejs \
    npm \
    sudo
RUN npm install \
  && npm run patch-xterm \
  && NODE_ENV=production npm run build
RUN useradd --create-home --uid 1000 --user-group --shell /bin/bash me \
  && echo "me ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/me

USER me
WORKDIR /home/me

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["/opt/app/entrypoint.sh"]
CMD []
