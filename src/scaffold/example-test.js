const generateExampleTest = (contract, entity, event) =>
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
            let ${entity.toLowerCase()} = new ${entity}("enittyId0")
            ${entity.toLowerCase()}.save()
        })

        afterAll(() => {
            clearStore()
        })
        
        test("Enitity created and stored", () => {
            assert.entityCount('${entity}', 1)
            assert.fieldEquals(
                '${entity}',
                "enittyId0",
                "id",
                "enittyId0",
            )
        })
    })
    `,
  ].join('\n')

module.exports = {
  generateExampleTest,
}
