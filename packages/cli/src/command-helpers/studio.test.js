const { validateStudioNetwork, allowedStudioNetworks } = require('./studio')

describe('Version Command Helpers', () => {
  describe('validateStudioNetwork', () => {
    describe("When it's studio", () => {
      test("And it's Ethereum mainnet", () => {
        expect(() => validateStudioNetwork({
          studio: true,
          network: 'mainnet',
        }))
          .not
          .toThrow(new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`))
      })

      test("And it's Gnosis chain", () => {
        expect(() => validateStudioNetwork({
          studio: true,
          network: 'gnosis',
        }))
          .not
          .toThrow(new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`))
      })

      test("And it's NOT an allowed network", () => {
        expect(() => validateStudioNetwork({
          product: 'subgraph-studio',
          network: 'celo',
        }))
          .toThrow(new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`))
      })
    })

    describe("When it's NOT studio", () => {
      test("And it's Rinkeby", () => {
        expect(() => validateStudioNetwork({
          studio: false,
          network: 'rinkeby',
        }))
          .not
          .toThrow(new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`))
      })

      test("And it's NOT an allowed network", () => {
        expect(() => validateStudioNetwork({
          product: 'hosted-service',
          network: 'celo',
        }))
          .not
          .toThrow(new Error(`The Subgraph Studio only allows subgraphs for these networks: ${allowedStudioNetworks.join(', ')}`))
      })
    })
  })
})
