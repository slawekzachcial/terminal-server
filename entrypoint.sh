#!/bin/bash

set -o errexit -o pipefail

readonly DOTFILES_REPO="$1"
readonly LOG_FILE="/home/me/dotfiles.log"

if [ -n "${DOTFILES_REPO}" ]; then
    git clone "${DOTFILES_REPO}" /home/me/dotfiles 2>&1 | tee "${LOG_FILE}"
    if [ -x /home/me/dotfiles/install.sh ]; then
        /home/me/dotfiles/install.sh 2>&1 | tee --append "${LOG_FILE}"
    fi
fi

node /opt/app/build/server.js
