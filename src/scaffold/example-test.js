const imports = [
  'import { assert, describe, test, beforeAll, beforeEach, afterEach, afterAll} from "matchstick-as/assembly/index"'
].join('\n')

const testsFlow = `
/**
* -- Hooks order --
* 
* - beforeAll
* 
* - describe
*  - beforeEach
*  - test
*  - afterEach
*  - beforeEach
*  - test
*  - afterEach
* 
* - afterAll
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
