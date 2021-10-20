module.exports = {
  validateSchema: require('./schema').validateSchema,
  validateManifest: require('./manifest').validateManifest,
  validateContractValues: require('./manifest').validateContractValues,
}
