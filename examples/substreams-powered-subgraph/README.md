# Substreams-powered subgraph: tracking contract creation

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

A basic Substreams

## Prerequisites

This
[requires the dependencies necessary for local Substreams development](https://substreams.streamingfast.io/developers-guide/installation-requirements),
as well as Graph CLI >=0.51.1:

```
yarn global add @graphprotocol/graph-cli
```

## Quickstart

```
make protogen # create protobufs in /src/pb
make build # build substream
make package # pack substream
graph build # build subgraph
graph deploy # deploy subgraph
```
