export const getSubgraphBasename = (name: string) => {
  const segments = name.split('/', 2);
  return segments[segments.length - 1];
};

export const formatSubgraphName = (slug: string) => {
  return slug
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
};

export const formatContractName = (contractName: string) => {
  return contractName.replace(/[\s.]+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
};
