var Migrations = artifacts.require('./Migrations.sol');

module.exports = async function () {
  const migrations = await Migrations.new();
  Migrations.setAsDeployed(migrations);
};
