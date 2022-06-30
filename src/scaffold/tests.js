const prettier = require('prettier')
const { strings } = require('gluegun')
const { ascTypeForEthereum, ethereumFromAsc } = require("../codegen/types")

const VARIABLES_VALUES = {
  "i32": 123,
  "BigInt": 234,
  "Bytes": 1234567890,
  "Address": "0x0000000000000000000000000000000000000001",
  "string": "Example string value",
  "bool": true,
}

const generateTestsFiles = (contract, events, indexEvents) => {
  const event = events[0]
  const eventsTypes = events.flatMap(event => event.inputs.map(input => ascTypeForEthereum(input.type))).filter(type => !isNativeType(type))
  const importTypes = [...new Set(eventsTypes)].join(', ');
  const entity = indexEvents ? `${event.name}` : 'ExampleEntity'

  return {
    [`${strings.kebabCase(contract)}.test.ts`]: prettier.format(generateExampleTest(contract, event, entity, importTypes), { parser: 'typescript', semi: false }),
    [`${strings.kebabCase(contract)}-utils.ts`]: prettier.format(generateTestHelper(contract, events, importTypes), { parser: 'typescript', semi: false }),
  }
}

const generateFieldsAssertions = (entity, eventInputs) => eventInputs.map( input => `
  assert.fieldEquals(
    '${entity}',
    "0xA16081F360e3847006dB660bae1c6d1b2e17eC2A",
    "${input.name}",
    "${VARIABLES_VALUES[ascTypeForEthereum(input.type)]}"
  )`
).join('\n')

const generateArguments = (eventInputs) => {
  return eventInputs.map(input => {
    let ascType = ascTypeForEthereum(input.type)
    return `let ${input.name} = ${generateValues(ascType, input.name)}`
  }).join('\n')
}

const generateValues = (type, name) => {
  switch(type) {
    case "string":
      return `"${VARIABLES_VALUES[type]}"`
    case "BigInt":
      return `BigInt.fromI32(${VARIABLES_VALUES[type]})`
    case "Address":
      return `Address.fromString("${VARIABLES_VALUES[type]}")`
    case "Bytes":
      return `Bytes.fromI32(${VARIABLES_VALUES[type]})`
    case type.match(/Array<(.*?)>/)?.input:
      innerType = type.match(/Array<(.*?)>/)[1]
      return `[${generateValues(innerType, name)}]`
    default:
      let value = VARIABLES_VALUES[type]
      return value ? value : `"${type} Not implemented"`
  }
}

const generateExampleTest = (contract, event, entity, importTypes) => {
    const eventInputs = event.inputs
    const eventName = event._alias

    return `
    import { assert, describe, test, clearStore, beforeAll, afterAll} from "matchstick-as/assembly/index"
    import { ${importTypes} } from "@graphprotocol/graph-ts"
    import { ${entity} } from "../generated/schema"
    import { ${eventName} } from "../generated/${contract}/${contract}"
    import { handle${eventName} } from "../src/${contract.toLowerCase()}"
    import { create${eventName}Event } from "./${contract}-utils"

    /**
     * Tests structure (matchstick-as >=0.5.0)
     * https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0
     */

    describe("Describe entity assertions", () => {
      beforeAll(() => {
        ${generateArguments(eventInputs)}
        let new${eventName}Event = create${eventName}Event(${eventInputs.map(input => input.name).join(', ')});
        handle${eventName}(new${eventName}Event)
      })

      afterAll(() => {
        clearStore()
      })

      test("${entity} created and stored", () => {
        assert.entityCount('${entity}', 1)

        // 0xA16081F360e3847006dB660bae1c6d1b2e17eC2A is the default address used in newMockEvent() function
        ${generateFieldsAssertions(entity, eventInputs)}
      })
    })
    `
  }

  const generateTestHelper = (contract, events, importTypes) => {
    const eventsNames = events.map(event => event.name)

    let utils = `
    import { newMockEvent } from 'matchstick-as';
    import { ethereum, ${importTypes} } from '@graphprotocol/graph-ts';
    import { ${eventsNames.join(', ')} } from '../generated/${contract}/${contract}';
    `

    events.forEach(function(event) {
      utils = utils.concat("\n", generateMockedEvent(event))
    });

    return utils
  }

  const generateMockedEvent = (event) => {
    const varName = `${strings.camelCase(event.name)}Event`
    const fnArgs = event.inputs.map(input => `${input.name}: ${ascTypeForEthereum(input.type)}`);
    const ascToEth = event.inputs.map(input => `${varName}.parameters.push(new ethereum.EventParam("${input.name}", ${ethereumFromAsc(input.name, input.type)}))`);

    return  `
      export function create${event._alias}Event(${fnArgs.join(', ')}): ${event._alias} {
        let ${varName} = changetype<${event._alias}>(newMockEvent());

        ${varName}.parameters = new Array();

        ${ascToEth.join('\n')}

        return ${varName};
      }
    `

  }

  const isNativeType = (type) => {
    let natives = [
      /Array<([a-zA-Z0-9]+)?>/,
      /i32/,
      /string/,
      /boolean/
    ]

    return natives.some(rx => rx.test(type));
  }
module.exports = {
  generateTestsFiles,
}
