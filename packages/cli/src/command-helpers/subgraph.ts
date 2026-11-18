import fs from 'node:fs';

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

export const validateSubgraphDirectory = (directory: string): true | string => {
  if (directory.length === 0) return 'Directory must not be empty';
  if (fs.existsSync(directory)) return 'Directory already exists. Please choose a new directory.';
  return true;
};
