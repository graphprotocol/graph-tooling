const immutable = require('immutable')
const { validateContractValues } = require('../../validation')

module.exports = class NearSubgraph {
  constructor(options = {}) {
    this.manifest = options.manifest
    this.resolveFile = options.resolveFile
    this.protocol = options.protocol
  }

  validateManifest() {
    return this.validateContractAccounts()
  }

  validateContractAccounts() {
    // Reference: https://docs.near.org/docs/concepts/account#account-id-rules
    const MINIMUM_ACCOUNT_ID_LENGTH = 2
    const MAXIMUM_ACCOUNT_ID_LENGTH = 64
    const validateLength = accountId =>
      accountId.length >= MINIMUM_ACCOUNT_ID_LENGTH &&
      accountId.length <= MAXIMUM_ACCOUNT_ID_LENGTH
    const nearAccountIdPattern = /^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$/

    return validateContractValues(
      this.manifest,
      this.protocol,
      'account',
      accountId => validateLength(accountId) && nearAccountIdPattern.test(accountId),
      `Must be between '${MINIMUM_ACCOUNT_ID_LENGTH}' and '${MAXIMUM_ACCOUNT_ID_LENGTH}' characters
An Account ID consists of Account ID parts separated by '.' (dots)
Each Account ID part consists of lowercase alphanumeric symbols separated by either a '_' (underscore) or '-' (dash)
For further information look for: https://docs.near.org/docs/concepts/account#account-id-rules`,
    )
  }

  handlerTypes() {
    return immutable.List([
      'blockHandlers',
      'receiptHandlers',
    ])
  }
}
