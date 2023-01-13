export const validateSubgraphName = (
  name: string,
  { allowSimpleName }: { allowSimpleName?: boolean },
) => {
  if (allowSimpleName) {
    return name;
  }
  if (name.split('/').length !== 2) {
    throw new Error(`Subgraph name "${name}" needs to have the format "<PREFIX>/${name}".

When using the Hosted Service at https://thegraph.com, <PREFIX> is the
name of your GitHub user or organization.

You can bypass this check with --allow-simple-name.`);
  }
};

export const getSubgraphBasename = (name: string) => {
  const segments = name.split('/', 2);
  return segments[segments.length - 1];
};
