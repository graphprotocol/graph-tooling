module.exports = {
  validateSchema: require('./schema').validateSchema,
  validateManifest: require('./manifest').validateManifest,
  validateContractValues: require('./contract').validateContractValues,
  validateContract: require('./contract').validateContract,
}
