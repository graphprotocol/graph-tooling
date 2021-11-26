const immutable = require('immutable')

const validateContract = (value, ProtocolContract) => {
  const contract = new ProtocolContract(value)

  const { valid, error } = contract.validate()

  if (!valid) {
    return {
      valid,
      error: `Contract ${ProtocolContract.identifierName()} is invalid: ${value}\n${error}`,
    }
  }

  return { valid, error }
}

const validateContractValues = (manifest, protocol) => {
  const ProtocolContract = protocol.getContract()

  const fieldName = ProtocolContract.identifierName()

  return manifest
    .get('dataSources')
    .filter(dataSource => protocol.isValidKindName(dataSource.get('kind')))
    .reduce((errors, dataSource, dataSourceIndex) => {
      let path = ['dataSources', dataSourceIndex, 'source', fieldName]

      // No need to validate if the source has no contract field
      if (!dataSource.get('source').has(fieldName)) {
        return errors
      }

      let contractValue = dataSource.getIn(['source', fieldName])


      const { valid, error } = validateContract(contractValue, ProtocolContract)

      // Validate whether the contract is valid for the protocol
      if (valid) {
        return errors
      } else {
        return errors.push(
          immutable.fromJS({
            path,
            message: error,
          }),
        )
      }
    }, immutable.List())
}

module.exports = {
  validateContract,
  validateContractValues,
}
