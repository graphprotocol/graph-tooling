export const source = ({ spkgPath, spkgModule }: { spkgPath?: string; spkgModule?: string }) => `
      package:
        moduleName: ${spkgModule || 'graph_out'}
        file: ${spkgPath || 'substreams.spkg'}`;

export const mapping = () => `
      apiVersion: 0.0.5
      kind: substreams/graph-entities`;
