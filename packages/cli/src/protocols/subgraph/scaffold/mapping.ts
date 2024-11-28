export const generatePlaceholderHandlers = ({
  entities,
  contract,
}: {
  entities: string[];
  contract: string;
}) => `
import { ExampleEntity } from '../generated/schema'
import {${entities.join(', ')}} from '../generated/subgraph-${contract}'
import { EntityTrigger } from '@graphprotocol/graph-ts'

${entities
  .map(
    entityName => `
export function handle${entityName}(entity: EntityTrigger<${entityName}>): void {
  // Empty handler for ${entityName}
}`,
  )
  .join('\n')}
`;
