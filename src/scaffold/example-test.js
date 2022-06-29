const generateFieldsAssertions = (entity, fields) => Object.keys(fields).map(fieldName => `
  assert.fieldEquals(
    '${entity}',
    "enittyId0",
    "${fieldName}",
    "eventInputs.${fieldName}"
  )`
).join('\n')

const generateExampleTest = (contract, entity, event, eventInputs) =>
  [
    [
      'import { assert, describe, test, clearStore, beforeAll, beforeEach, afterEach, afterAll} from "matchstick-as/assembly/index"',
      `import { ${entity} } from "../generated/schema"`,
      `import { ${event} } from "../generated/${contract}/${contract}"`,
      `import { handle${event} } from "../src/${contract.toLowerCase()}"`,
    ].join('\n'),

    `
    /**
     * Tests structure (matchstick-as >=0.5.0)
     * https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0
     */
    
    describe("Describe entity assertions", () => {
        beforeAll(() => {
            let new${event}Event = create${event}Event(${eventInputs})
            handle${event}(new${event}Event)
        })

        afterAll(() => {
            clearStore()
        })
        
        test("Enitity created and stored", () => {
            assert.entityCount('${entity}', 1)
            ${generateFieldsAssertions(event, fields)}
        })
    })
    `,
  ].join('\n')

module.exports = {
  generateExampleTest,
}
