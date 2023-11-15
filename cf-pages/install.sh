#!/bin/bash

if [ -n "$1" ]
then
    INSTALL_DIR=${1%%/}
    BIN_DIR=
else
    INSTALL_DIR=/usr/local/lib
    BIN_DIR=/usr/local/bin
fi

if [ ! -w "$INSTALL_DIR" ]
then
    cat <<EOF
usage: install.sh [DIR]

Install graph-cli to DIR. DIR defaults to /usr/local/lib.

The directory $INSTALL_DIR is not writable by the current user.

Try running this script as root for a system-wide install which will also
put 'graph' into /usr/local/bin or pass an installation directory that is
writable by the current user as DIR
EOF
    exit 1
fi

set -e

OS=""
ARCH=""

echoerr() { echo "$@" 1>&2; }

unsupported_arch() {
    local os=$1
    local arch=$2
    echoerr "The Graph CLI does not support $os / $arch at this time."
    exit 1
}

set_os_arch() {
    if [ "$(uname)" == "Darwin" ]; then
        OS=darwin
    elif [ "$(uname -s)" == "Linux" ]; then
        OS=linux
    else
        OS=win32
    fi

    ARCH="$(uname -m)"
    if [ "$ARCH" == "x86_64" ]; then
        ARCH=x64
    elif [ "$ARCH" == "amd64" ]; then
        ARCH=x64
    elif [ "$ARCH" == "arm64" ]; then
        if [ "$OS" == "darwin" ]; then
            ARCH=arm64
        else
            ARCH=arm
        fi
    elif [[ "$ARCH" == aarch* ]]; then
        ARCH=arm
    else
        unsupported_arch $OS $ARCH
    fi
}

download() {
    DOWNLOAD_DIR=$(mktemp -d)

    TARGET="$OS-$ARCH"
    URL="https://github.com/graphprotocol/graph-tooling/releases/latest/download/graph-$TARGET.tar.gz"
    echo "Downloading $URL"

    if ! curl --progress-bar --fail -L "$URL" -o "$DOWNLOAD_DIR/graph.tar.gz"; then
        echo "Download failed."
        exit 1
    fi

    echo "Downloaded to $DOWNLOAD_DIR"

    rm -rf "${INSTALL_DIR}/graph"
    tar xzf "$DOWNLOAD_DIR/graph.tar.gz" -C "$INSTALL_DIR"
    rm -rf "$DOWNLOAD_DIR"
    echo "Unpacked to $INSTALL_DIR"

    if [ -n "$BIN_DIR" ]
    then
        echo "Installing to ${BIN_DIR}/graph"
        rm -f "$BIN_DIR/graph"
        ln -s "$INSTALL_DIR/graph/bin/graph" "$BIN_DIR/graph"
        LOCATION="$BIN_DIR/graph"
    else
        LOCATION="$INSTALL_DIR/graph/bin/graph"
    fi
}

set_os_arch
download

echo "The Graph CLI installed to $LOCATION"
$LOCATION --version
