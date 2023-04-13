# hardhat-graph [POC/WIP]

This is a hardhat plugin that aims to make subgraph building easy for Ethereum developers. The goal
is to allow the users to mimic a big portion of the graph-cli functionality. Below you can see a
list of the currently available tasks, for a demo project that show how to use the pulgin you can
check [this repo](https://github.com/graphprotocol/hardhat-graph-demo).

NOTE: This project is POC/WIP, there could be breaking changes or bugs.

## Tasks

### `init`

- Expects two parameters: `contractName: 'MyContract'` and `address: '0x123..'`
- Has optional param `startBlock` - the optional number of the block that the data source starts
  indexing from
- Workflow:
  - Generates a subgraph in `./subgraph` using `generateScaffold` from `graph-cli`
  - Generates a network.json file in `./subgraph` using `initNetworksConfig` from `graph-cli`
  - Initializes a new repo if one does not currently exist. (Currently it does not create an initial
    commit)
  - Generates or updates an existing .gitignore file.
  - Runs `codegen` command
- Example usage:

```typescript
async function deploy(contractName: string) {
  ....
  await contract.deployed();
  return { contractName: contractName , address: contract.address}
}

deploy()
  .then((result) => hre.run('init', result))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### `update`

- Expects two parameters: `contractName: 'MyContract'` and `address: '0x123..'`
- Has optional param `startBlock` - the optional number of the block that the data source starts
  indexing from
- Workflow:
  - Updates the contract ABI in `./subgraph/abis`
  - Updates the contract Address in `network.json` if it's deployed to the same network. If the
    contract has been deployed to a network that is not present in the config file, adds an entry
    for the new network.
  - Checks for changes to the contract events. If there are any changes the task will exit and the
    user will be informed and prompted to address the changes in the subgraph.yaml file and manually
    run `codegen` and `build`.
  - Runs `codegen` if there are no changes to the contract events.
  - For now you'll have to manually run `graph build --network <network>` from the subgraph folder
    if you want to update the dataSources network in the subgraph.
- Example usage:

```typescript
async function deploy(contractName: string) {
  ....
  await contract.deployed();
  return { contractName: contractName , address: contract.address}
}

deploy()
  .then((result) => hre.run('update', result))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### `add`

- Expects one mandatory parameter: `address: '0x123..`
- Has optional param `startBlock` - the optional number of the block that the data source starts
  indexing from
- Has four optional paramaters:
  - `subgraphYaml: path/to/subgraph.yaml` (default is './subgraph.yaml')
  - `abi: path/to/Contract.json` Loads abi from file
  - `mergeEntities` When this flag is given new entities with already taken names are skipped
  - `contractName: MyContract` (default is 'Contract')
- Workflow:

  - Checks whether the subgraph exists and creates a command line of the arguments passed
  - Runs `graph add` from the graph-cli with the given params which updates the `subgraph.yaml`,
    `schema.graphql` and adds a new abi and mapping file
  - Runs `codegen`

- Example usage:

```sh
npx hardhat add --address 0x123... --abi path/to/Contract.json --contactName MyContract --merge-entities
```

### `graph`

- Expects two parameters: `contractName: 'MyContract'` and `address: '0x123..` and an optional
  positional parameter `subtask` <init|update|add>.
- Workflow:
  - Conditionally runs either `init`, `update` or `add` tasks depending if a subgraph already exists
    or not. If the optional param `subtask` is passed it will run that subtask instead.
- Example usage:

```typescript
async function deploy(contractName: string) {
  ....
  await contract.deployed();
  const deployTx = await contract.deployTransaction.wait();
  return { contractName: MyContract , address: contract.address, blockNumber: deployTx.blockNumber}
}

deploy()
  .then((result) => hre.run('graph', result))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

or

```sh
npx hardhat graph < init | update | add > --contract-name MyContract --address 0x123... # the subtask parameter is optional
```

## How to

NOTE: npm >7 should auto-install peerDependencies from plugins, but if they are not or you're using
`yarn`, add

```
"@graphprotocol/graph-cli": "^0.30.0",
"@graphprotocol/graph-ts": "^0.27.0",
```

to the hardhat project package.json (Because the `graph add` command was added in version 0.30.0,
this is also the minimum required version)

The plugin can be installed from the repo:

```json
{
  ...
  "devDependencies": {
    "hardhat-graph": "https://github.com/graphprotocol/hardhat-graph"
    ...
  }
}
```

or from a specific branch:

```json
{
  ...
  "devDependencies": {
    "hardhat-graph": "https://github.com/graphprotocol/hardhat-graph#branch_name"
    ...
  }
}
```

Import the plugin in your `hardhat.config` file:

JS: `require("@graphprotocol/hardhat-graph")`

TS: `import "@graphprotocol/hardhat-graph"`

## Configurable options in hardhat.config file

JS:

```javascript
module.exports = {
  ...
  subgraph: {
    name: 'MySubgraph', // Defaults to the name of the root folder of the hardhat project
    product: 'hosted-service'|'subgraph-studio', // Defaults to 'subgraph-studio'
    indexEvents: true|false, // Defaults to false
    allowSimpleName: true|false // Defaults to `false` if product is `hosted-service` and `true` if product is `subgraph-studio`
  },
  paths: {
    subgraph: './path/to/subgraph' // Defaults to './subgraph'
  }
}
```

TS:

```typescript
export default {
  ...
  subgraph: {
    name: 'MySubgraph', // Defaults to the name of the root folder of the hardhat project
    product: 'hosted-service'|'subgraph-studio', // Defaults to 'subgraph-studio'
    indexEvents: true|false, // Defaults to false
    allowSimpleName: true|false // Defaults to `false` if product is `hosted-service` and `true` if product is `subgraph-studio`
  },
  paths: {
    subgraph: './path/to/subgraph' // Defaults to './subgraph'
  }
}
```

## Running local `graph node` against local `hardhat node`

1. Create a `docker-compose.yml` file:

```
version: '3'
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
      - '8030:8030'
      - '8040:8040'
    depends_on:
      - ipfs
      - postgres
    extra_hosts:
      - host.docker.internal:host-gateway
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: 'ipfs:5001'
      ethereum: 'localhost:http://host.docker.internal:8545'
      GRAPH_LOG: info
  ipfs:
    image: ipfs/go-ipfs:v0.10.0
    ports:
      - '5001:5001'
    volumes:
      - ./data/ipfs:/data/ipfs
  postgres:
    image: postgres
    ports:
      - '5432:5432'
    command:
      [
        "postgres",
        "-cshared_preload_libraries=pg_stat_statements"
      ]
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: let-me-in
      POSTGRES_DB: graph-node
      PGDATA: "/data/postgres"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
```

2. Add the following to the networks configuration in your `hardhat.config` file:

```
{
  ...
  networks: {
      localhost: {
        url: "http://0.0.0.0:8545",
      },
    },
   ...
 }
```

3. Run the hardhat node with `npx hardhat node --hostname 0.0.0.0`
4. Deploy your contract[s] to the localhost network either with a deploy script/task or through the
   hardhat console `npx hardhat console --network localhost`
5. Update the network configuration in `subgraph.yaml` file to `localhost` and the addresses to the
   deployed contract addresses (You can use `yarn build --network localhost`. If you use
   graph-cli >= 0.32.0 you can skip this step and see step 7)
6. Run `docker-compose up` or `docker compose up`
7. Create and deploy the subgraph using the commands in the package.json `yarn create-local` and
   `yarn deploy-local` (Since graph-cli 0.32.0 you can use `--network localhost` option with the
   deploy command, similarly to `yarn build` in step 5)
8. Interact with your contract
9. Query the subgraph from `http://127.0.0.1:8000/subgraphs/name/<your-subgraph-name>/graphql`

NOTE: If for any reason you stop the hardhat node, it is recommended to stop the graph node, delete
the `ipfs` and `postgres` folders in `data` (or the whole `data` folder) created by the graph node
(you can run `yarn graph-local-clean` that will do that for you), and then repeat steps `3-9`.
