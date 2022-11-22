const source = () => `
      package:
        moduleName: graph_out
        file: substreams-eth-block-meta-v0.1.0.spkg`

const mapping = () => `
      apiVersion: 0.0.5
      kind: substreams/graph-entities`

module.exports = {
  source,
  mapping,
}
