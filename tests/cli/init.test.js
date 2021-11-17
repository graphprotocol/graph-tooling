const path = require('path')
const { cliTest } = require('./util')

describe('Init', () => {
  const baseDir = path.join(__dirname, 'init')

  describe('Ethereum', () => {
    const ethereumBaseDir = path.join(baseDir, 'ethereum')

    cliTest(
      'From example',
      [
        'init',
        '--protocol',
        'ethereum',
        '--studio',
        '--from-example',
        'user/example-subgraph',
        path.join(ethereumBaseDir, 'from-example'),
      ],
      path.join('init', 'ethereum', 'from-example'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: ethereumBaseDir,
        deleteDir: true,
      },
    )

    cliTest(
      'From contract',
      [
        'init',
        '--protocol',
        'ethereum',
        '--studio',
        '--from-contract',
        '0xF87E31492Faf9A91B02Ee0dEAAd50d51d56D5d4d',
        '--network',
        'mainnet',
        'user/subgraph-from-contract',
        path.join(ethereumBaseDir, 'from-contract'),
      ],
      path.join('init', 'ethereum', 'from-contract'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: ethereumBaseDir,
        deleteDir: true,
      },
    )

    cliTest(
      'From contract with abi',
      [
        'init',
        '--protocol',
        'ethereum',
        '--studio',
        '--from-contract',
        '0xF87E31492Faf9A91B02Ee0dEAAd50d51d56D5d4d',
        '--abi',
        path.join(ethereumBaseDir, 'abis', 'Marketplace.json'),
        '--network',
        'mainnet',
        'user/subgraph-from-contract-with-abi',
        path.join(ethereumBaseDir, 'from-contract-with-abi'),
      ],
      path.join('init', 'ethereum', 'from-contract-with-abi'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: ethereumBaseDir,
        deleteDir: true,
      },
    )

    cliTest(
      'From contract with abi and structs',
      [
        'init',
        '--protocol',
        'ethereum',
        '--studio',
        '--from-contract',
        '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
        '--abi',
        path.join(ethereumBaseDir, 'abis', 'SoloMargin.json'),
        '--network',
        'mainnet',
        'user/subgraph-from-contract-with-abi-and-structs',
        path.join(ethereumBaseDir, 'from-contract-with-abi-and-structs'),
      ],
      path.join('init', 'ethereum', 'from-contract-with-abi-and-structs'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: ethereumBaseDir,
        deleteDir: true,
      },
    )

    cliTest(
      'From contract with overloaded elements',
      [
        'init',
        '--protocol',
        'ethereum',
        '--studio',
        '--from-contract',
        '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
        '--abi',
        path.join(ethereumBaseDir, 'abis', 'OverloadedElements.json'),
        '--network',
        'mainnet',
        'user/subgraph-from-contract-with-overloaded-elements',
        path.join(ethereumBaseDir, 'from-contract-with-overloaded-elements'),
      ],
      path.join('init', 'ethereum', 'from-contract-with-overloaded-elements'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: ethereumBaseDir,
        deleteDir: true,
      },
    )
  })

  describe('NEAR', () => {
    const nearBaseDir = path.join(baseDir, 'near')

    cliTest(
      'From contract',
      [
        'init',
        '--protocol',
        'near',
        '--product',
        'hosted-service',
        '--from-contract',
        'app.good-morning.near',
        '--network',
        'near-mainnet',
        'user/near-from-contract',
        path.join(nearBaseDir, 'from-contract'),
      ],
      path.join('init', 'near', 'from-contract'),
      {
        exitCode: 0,
        timeout: 100000,
        cwd: nearBaseDir,
        deleteDir: true,
      },
    )
  })
})
