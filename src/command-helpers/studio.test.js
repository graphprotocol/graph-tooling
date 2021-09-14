const { validateStudioNetwork } = require('./studio')

describe('Version Command Helpers', () => {
  describe('validateStudioNetwork', () => {
    describe("When it's studio", () => {
      test("And it's Ethereum mainnet", () => {
        expect(() => validateStudioNetwork({
          studio: true,
          network: 'mainnet',
        }))
          .not
          .toThrow(new Error('Non Ethereum mainnet subgraphs should not be deployed to the studio'))
      })

      test("And it's NOT Ethereum mainnet", () => {
        expect(() => validateStudioNetwork({
          product: 'subgraph-studio',
          network: 'xdai',
        }))
          .toThrow(new Error('Non Ethereum mainnet subgraphs should not be deployed to the studio'))
      })
    })

    describe("When it's NOT studio", () => {
      test("And it's Ethereum mainnet", () => {
        expect(() => validateStudioNetwork({
          studio: false,
          network: 'mainnet',
        }))
          .not
          .toThrow(new Error('Non Ethereum mainnet subgraphs should not be deployed to the studio'))
      })

      test("And it's NOT Ethereum mainnet", () => {
        expect(() => validateStudioNetwork({
          product: 'hosted-service',
          network: 'xdai',
        }))
          .not
          .toThrow(new Error('Non Ethereum mainnet subgraphs should not be deployed to the studio'))
      })
    })
  })
})
