export const source = ({
  contract,
  startBlock,
}: {
  contract: string;
  contractName: string;
  startBlock: string;
}) =>
  `
      address: '${contract}'
      startBlock: ${startBlock}`;

export const mapping = ({
  entities,
  contractName,
}: {
  entities: string[];
  contractName: string;
}) => `
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
       - ExampleEntity
      handlers:
      ${entities
        .map(
          entity => `
        - handler: handle${entity}
          entity: ${entity}`,
        )
        .join(' ')}
      file: ./src/${contractName}.ts
`;
