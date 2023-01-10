import { abiEvents } from '../../../scaffold/schema'
import { strings } from 'gluegun'
import ABI from '../abi'

const source = ({ contract, contractName }) => `
      address: '${contract}'
      abi: ${contractName}`

const mapping = ({ abi, contractName }) => `
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        ${abiEvents(abi)
          .map(event => `- ${event.get('_alias')}`)
          .join('\n        ')}
      abis:
        - name: ${contractName}
          file: ./abis/${contractName}.json
      eventHandlers:
        ${abiEvents(abi)
          .map(
            event => `
        - event: ${ABI.eventSignature(event)}
          handler: handle${event.get('_alias')}`,
          )
          .join('')}
      file: ./src/${strings.kebabCase(contractName)}.ts`

export { source, mapping }
