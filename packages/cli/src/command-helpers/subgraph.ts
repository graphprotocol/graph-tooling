export const getSubgraphBasename = (name: string) => {
  const segments = name.split('/', 2);
  return segments[segments.length - 1];
};
