const GravatarRegistry = artifacts.require('./GravatarRegistry.sol');

module.exports = async function () {
  const gravatarRegistry = await GravatarRegistry.new();
  GravatarRegistry.setAsDeployed(gravatarRegistry);
};
