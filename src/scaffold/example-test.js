const imports = [
  'import { assert, describe, test, beforeAll, beforeEach, afterEach, afterAll} from "matchstick-as/assembly/index"'
].join('\n')

const testsFlow = `
/**
* Tests structure (matchstick-as >=0.5.0)
* https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0
*/

beforeAll(() => {
 console.log("Before all tests");
})

beforeEach(() => {
 console.log("Before each test");
})

describe("Describe info", () => {
 test("Test case info", () => {
   const variable = null
   assert.assertNull(variable)
 })
})

afterEach(() => {
 console.log("After each test");
})

afterAll(() => {
 console.log("After all tests");
})`

const generateExampleTest = () => [ imports, testsFlow].join('\n')

module.exports = {
  generateExampleTest,
}
