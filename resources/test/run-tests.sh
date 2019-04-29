#!/bin/bash

set -e
set -x

set -o nounset
set -o errexit

wait-for-it.sh ipfs:5001 -t 30
wait-for-it.sh parity:8545 -t 30
wait-for-it.sh graph-node:8000 -t 30

eval $*
