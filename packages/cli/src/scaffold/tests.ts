import { strings } from 'gluegun';
import prettier from 'prettier';
import { ascTypeForEthereum, ethereumFromAsc } from '../codegen/types/index.js';

const VARIABLES_VALUES = {
  i32: 123,
  BigInt: 234,
  Bytes: 1_234_567_890,
  Address: '0x0000000000000000000000000000000000000001',
  string: 'Example string value',
  bool: true,
};

export const generateTestsFiles = async (contract: any, events: any[], indexEvents?: boolean) => {
  const eventsTypes = events
    .flatMap(event =>
      event.inputs.map((input: any) => {
        // If the asc type is Array<T> we need to check if T is a native type or a custom graph-ts type
        // If we don't do that we may miss a type that should be imported from graph-ts
        const ascType = ascTypeForEthereum(input.type);
        const inner = fetchArrayInnerType(String(ascType));
        return inner ? inner[1] : ascType;
      }),
    )
    .filter(type => !type.startsWith('ethereum.') && !isNativeType(type));
  const importTypes = [...new Set(eventsTypes)].join(', ');

  return {
    [`${strings.kebabCase(contract)}.test.ts`]: await prettier.format(
      generateExampleTest(contract, events[0], indexEvents, importTypes),
      { parser: 'typescript', semi: false, trailingComma: 'none' },
    ),
    [`${strings.kebabCase(contract)}-utils.ts`]: await prettier.format(
      generateTestHelper(contract, events, importTypes),
      { parser: 'typescript', semi: false, trailingComma: 'none' },
    ),
  };
};

/*
  Generates the arguments that will be passed to the mock event function from the event inputs. Example:
  let id = BigInt.fromI32(234)
  let owner = Address.fromString("0x0000000000000000000000000000000000000001")
  let displayName = "Example string value"
  let imageUrl = "Example string value"
*/
const generateArguments = (eventInputs: any[]) => {
  return eventInputs
    .map((input, index) => {
      const ascType = ascTypeForEthereum(input.type);
      return `let ${input.name || `param${index}`} = ${assignValue(ascType)}`;
    })
    .join('\n');
};

// Generates the value that will be assigned to a variable in generateArguments()
const assignValue = (type: string): string | number | boolean => {
  switch (type) {
    case 'string':
      return `"${VARIABLES_VALUES[type]}"`;
    case 'BigInt':
      return `BigInt.fromI32(${VARIABLES_VALUES[type]})`;
    case 'Address':
      return `Address.fromString("${VARIABLES_VALUES[type]}")`;
    case 'Bytes':
      return `Bytes.fromI32(${VARIABLES_VALUES[type]})`;
    case fetchArrayInnerType(type)?.input: {
      const innerType = fetchArrayInnerType(type)![1];
      return `[${assignValue(innerType)}]`;
    }
    default: {
      const value = VARIABLES_VALUES[type as keyof typeof VARIABLES_VALUES];
      return value || `"${type} Not implemented"`;
    }
  }
};

/*
  Generates the assert.fieldEquals() for a given entity and event inputs. Example:
  assert.fieldEquals(
    "ExampleEntity",
    "0xa16081f360e3847006db660bae1c6d1b2e17ec2a",
    "owner",
    "0x0000000000000000000000000000000000000001"
  )
*/
const generateFieldsAssertions = (entity: string, eventInputs: any[], indexEvents?: boolean) =>
  eventInputs
    .filter(input => input.name != 'id')
    .map(
      (input, index) =>
        `assert.fieldEquals(
    "${entity}",
    "0xa16081f360e3847006db660bae1c6d1b2e17ec2a${indexEvents ? '-1' : ''}",
    "${input.name || `param${index}`}",
    "${expectedValue(ascTypeForEthereum(input.type))}"
  )`,
    )
    .join('\n');

// Returns the expected value for a given type in generateFieldsAssertions()
const expectedValue = (type: string): string | number | boolean => {
  switch (type) {
    case fetchArrayInnerType(type)?.input: {
      const innerType = fetchArrayInnerType(type)![1];
      return `[${expectedValue(innerType)}]`;
    }
    default: {
      const value = VARIABLES_VALUES[type as keyof typeof VARIABLES_VALUES];
      return value || `${type} Not implemented`;
    }
  }
};

// Checks if the type is a native AS type or should be imported from graph-ts
const isNativeType = (type: string) => {
  const natives = [/i32/, /string/, /boolean/];

  return natives.some(rx => rx.test(type));
};

// get inner type: Array<T> -> T, Array<Array<T>> -> T
const fetchArrayInnerType = (type: string): RegExpMatchArray | null => {
  const match = type.match(/Array<(.+)>/);
  if (!match) return null;

  return fetchArrayInnerType(match[1]) || match;
};

// Generates the example test.ts file
const generateExampleTest = (
  contract: string,
  event: any,
  indexEvents?: boolean,
  importTypes?: string,
) => {
  const entity = indexEvents ? String(event._alias) : 'ExampleEntity';
  const eventInputs = event.inputs;
  const eventName = event._alias;

  return `
  import { assert, describe, test, clearStore, beforeAll, afterAll } from "matchstick-as/assembly/index"
  import { ${importTypes} } from "@graphprotocol/graph-ts"
  import { ${entity} } from "../generated/schema"
  import { ${
    indexEvents ? `${eventName} as ${eventName}Event` : eventName
  } } from "../generated/${contract}/${contract}"
  import { handle${eventName} } from "../src/${strings.kebabCase(contract)}"
  import { create${eventName}Event } from "./${strings.kebabCase(contract)}-utils"


  // Tests structure (matchstick-as >=0.5.0)
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

  describe("Describe entity assertions", () => {
    beforeAll(() => {
      ${generateArguments(eventInputs)}
      let new${eventName}Event = create${eventName}Event(${eventInputs
        .map((input: any, index: number) => input.name || `param${index}`)
        .join(', ')});
      handle${eventName}(new${eventName}Event)
    })

    afterAll(() => {
      clearStore()
    })

    // For more test scenarios, see:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

    test("${entity} created and stored", () => {
      assert.entityCount('${entity}', 1)

      // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
      ${generateFieldsAssertions(entity, eventInputs, indexEvents)}

      // More assert options:
      // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
    })
  })
`;
};

// Generates the utils helper file
const generateTestHelper = (contract: string, events: any[], importTypes: string) => {
  const eventsNames = events.map(event => event._alias);

  return `
  import { newMockEvent } from 'matchstick-as';
  import { ethereum, ${importTypes} } from '@graphprotocol/graph-ts';
  import { ${eventsNames.join(', ')} } from '../generated/${contract}/${contract}';

  ${generateMockedEvents(events).join('\n')}`;
};

const generateMockedEvents = (events: any[]) =>
  events.reduce((acc, event) => acc.concat(generateMockedEvent(event)), []);

const generateMockedEvent = (event: any) => {
  const varName = `${strings.camelCase(event._alias)}Event`;
  const fnArgs = event.inputs.map(
    (input: any, index: number) =>
      `${input.name || `param${index}`}: ${ascTypeForEthereum(input.type)}`,
  );
  const ascToEth = event.inputs.map(
    (input: any, index: number) =>
      `${varName}.parameters.push(new ethereum.EventParam("${
        input.name || `param${index}`
      }", ${ethereumFromAsc(input.name || `param${index}`, input.type)}))`,
  );

  return `
    export function create${event._alias}Event(${fnArgs.join(', ')}): ${event._alias} {
      let ${varName} = changetype<${event._alias}>(newMockEvent());

      ${varName}.parameters = new Array();

      ${ascToEth.join('\n')}

      return ${varName};
    }
  `;
};
