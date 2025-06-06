import path from 'node:path';
import { describe } from 'vitest';
import { cliTest } from './util';

// we run the tests sequentially because each init command installs deps with the
// same package manager and we want to avoid race conditions on the deps cache
describe(
  'Init',
  {
    sequential: true,
    timeout: 500_000,
  },
  () => {
    const baseDir = path.join(__dirname, 'init');

    describe('Ethereum', () => {
      const ethereumBaseDir = path.join(baseDir, 'ethereum');

      cliTest(
        'From example',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
          '--from-example',
          'ethereum/gravatar',
          'user/example-subgraph',
          path.join(ethereumBaseDir, 'from-example'),
        ],
        path.join('init', 'ethereum', 'from-example'),
        {
          exitCode: 0,
          timeout: 200_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
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
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract with abi',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
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
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract with abi and structs',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
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
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract with list items in abi',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
          '--from-contract',
          '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
          '--abi',
          path.join(ethereumBaseDir, 'abis', 'Airdropped.json'),
          '--network',
          'mainnet',
          'user/subgraph-from-contract-with-lists-in-abi',
          path.join(ethereumBaseDir, 'from-contract-with-lists-in-abi'),
        ],
        path.join('init', 'ethereum', 'from-contract-with-lists-in-abi'),
        {
          exitCode: 0,
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract with overloaded elements',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
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
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
        },
      );

      cliTest(
        'From contract with index events and abi with ID in events',
        [
          'init',
          '--skip-git',
          '--protocol',
          'ethereum',
          '--from-contract',
          '0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85',
          '--index-events',
          '--abi',
          path.join(ethereumBaseDir, 'abis', 'Ids.json'),
          '--network',
          'mainnet',
          'user/subgraph-from-contract-with-index-events-and-abi-with-id',
          path.join(ethereumBaseDir, 'duplicate-ids'),
        ],
        path.join('init', 'ethereum', 'duplicate-ids'),
        {
          exitCode: 0,
          timeout: 100_000,
          cwd: ethereumBaseDir,
          deleteDir: true,
          runBuild: true,
        },
      );
    });

    describe('NEAR', () => {
      const nearBaseDir = path.join(baseDir, 'near');

      cliTest(
        'From contract',
        [
          'init',
          '--skip-git',
          '--protocol',
          'near',
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
          timeout: 100_000,
          cwd: nearBaseDir,
          deleteDir: true,
        },
      );
    });

    describe('Substreams', () => {
      const substreamsBaseDir = path.join(baseDir, 'substreams');

      cliTest(
        'From package',
        [
          'init',
          '--skip-git',
          '--protocol',
          'substreams',
          '--spkg',
          path.join(substreamsBaseDir, 'substreams.spkg'),
          '--network',
          'mainnet',
          'user/subgraph-from-substreams',
          path.join(substreamsBaseDir, 'from-package'),
        ],
        path.join('init', 'substreams', 'from-package'),
        {
          exitCode: 0,
          timeout: 100_000,
          cwd: substreamsBaseDir,
          deleteDir: true,
        },
      );
    });

    describe('From existing subgraph', () => {
      const fromSubgraphBaseDir = path.join(baseDir, 'subgraph');

      cliTest(
        'From existing subgraph',
        [
          'init',
          '--skip-git',
          '--from-subgraph',
          'QmSgvtjK6b5GmnSeboH9AMdVrK8YeVrmJ1ESHw3WhYKdDH',
          '--network',
          'base',
          '--protocol',
          'subgraph',
          'user/from-existing-subgraph',
          path.join(fromSubgraphBaseDir, 'from-subgraph'),
        ],
        path.join('init', 'subgraph', 'from-subgraph'),
        {
          exitCode: 0,
          timeout: 100_000,
          cwd: fromSubgraphBaseDir,
          deleteDir: true,
        },
      );
    });
  },
);
