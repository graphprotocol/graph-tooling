module.exports = {
  validateSchema: require('./schema').validateSchema,
  validateManifest: require('./manifest').validateManifest,
  validateContractAddresses: require('./manifest').validateContractAddresses,
}
