export const source = ({ spkgPath }: { spkgPath?: string }) => `
      package:
        moduleName: graph_out
        file: ${spkgPath || 'substreams-eth-block-meta-v0.1.0.spkg'}`;

export const mapping = () => `
      apiVersion: 0.0.5
      kind: substreams/graph-entities`;
