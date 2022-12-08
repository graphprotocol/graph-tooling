var Migrations = artifacts.require('./Migrations.sol')

export default function(deployer) {
  deployer.deploy(Migrations)
}
