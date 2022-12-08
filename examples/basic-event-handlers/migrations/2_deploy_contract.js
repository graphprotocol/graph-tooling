const GravatarRegistry = artifacts.require('./GravatarRegistry.sol')

export default async function (deployer) {
  await deployer.deploy(GravatarRegistry)
}
