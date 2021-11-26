const MINIMUM_ACCOUNT_ID_LENGTH = 2
const MAXIMUM_ACCOUNT_ID_LENGTH = 64

const RULES_URL = 'https://docs.near.org/docs/concepts/account#account-id-rules'

module.exports = class NearContract {
  static identifierName() {
    return 'account'
  }

  constructor(account) {
    this.account = account
  }

  _validateLength() {
    return this.account.length >= MINIMUM_ACCOUNT_ID_LENGTH &&
      this.account.length <= MAXIMUM_ACCOUNT_ID_LENGTH
  }

  _validateFormat() {
    const pattern = /^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$/

    return pattern.test(this.account)
  }

  validate() {
    if (!this._validateLength(this.account)) {
      return {
        valid: false,
        error: `Account must be between '${MINIMUM_ACCOUNT_ID_LENGTH}' and '${MAXIMUM_ACCOUNT_ID_LENGTH}' characters, see ${RULES_URL}`,
      }
    }

    if (!this._validateFormat()) {
      return {
        valid: false,
        error: `Account must conform to the rules on ${RULES_URL}`,
      }
    }

    return {
      valid: true,
      error: null,
    }
  }
}
