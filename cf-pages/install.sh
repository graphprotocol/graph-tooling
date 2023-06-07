#!/bin/bash
{
  set -e
  SUDO=''
  if [ "$(id -u)" != "0" ]; then
    SUDO='sudo'
    echo "This script requires superuser access."
    echo "You will be prompted for your password by sudo."
    # clear any previous sudo permission
    sudo -k
  fi

  # run inside sudo
  $SUDO bash << SCRIPT
      set -e

      OS=""
      ARCH=""
      OS_ARCH=""

      echoerr() { echo "\$@" 1>&2; }

      unsupported_arch() {
        local os=$1
        local arch=$2
        echoerr "The Graph CLI does not support $os / $arch at this time."
        exit 1
      }

      set_os_arch() {
        if [ "\$(uname)" == "Darwin" ]; then
          OS=darwin
        elif [ "\$(expr substr \$(uname -s) 1 5)" == "Linux" ]; then
          OS=linux
        else
          OS=win32
        fi

        ARCH="\$(uname -m)"
        if [ "\$ARCH" == "x86_64" ]; then
          ARCH=x64
        elif [ "\$ARCH" == "amd64" ]; then
          ARCH=x64
        elif [ "\$ARCH" == "arm64" ]; then
          if [ "\$OS" == "darwin" ]; then
            ARCH=arm64
          else
            ARCH=arm
          fi
        elif [[ "\$ARCH" == aarch* ]]; then
          ARCH=arm
        else
          unsupported_arch $OS $ARCH
        fi
      }

      download() {
        DOWNLOAD_DIR=$(mktemp -d)

        TARGET="\$OS-\$ARCH"
        URL="https://github.com/graphprotocol/graph-tooling/releases/latest/download/graph-\$TARGET.tar.gz"
        echo "Downloading \$URL"

        if ! curl --progress-bar --fail -L "\$URL" -o "\$DOWNLOAD_DIR/graph.tar.gz"; then
          echo "Download failed."
          exit 1
        fi

        echo "Downloaded to \$DOWNLOAD_DIR"

        rm -rf "/usr/local/lib/graph"
        tar xzf "\$DOWNLOAD_DIR/graph.tar.gz" -C /usr/local/lib
        rm -rf "\$DOWNLOAD_DIR"
        echo "Unpacked to /usr/local/lib/graph"

        echo "Installing to /usr/local/bin/graph"
        rm -f /usr/local/bin/graph
        ln -s /usr/local/lib/graph/bin/graph /usr/local/bin/graph
      }

      set_os_arch
      download

SCRIPT
  LOCATION=$(command -v graph)
  echo "The Graph CLI installed to $LOCATION"
  graph --version
}
