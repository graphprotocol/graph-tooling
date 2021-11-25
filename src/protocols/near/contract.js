const MINIMUM_ACCOUNT_ID_LENGTH = 2
const MAXIMUM_ACCOUNT_ID_LENGTH = 64

module.exports = class NearContract {
  static identifierName() {
    return 'account'
  }

  static pattern() {
    return /^(([a-z\d]+[\-_])*[a-z\d]+\.)*([a-z\d]+[\-_])*[a-z\d]+$/
  }

  static errorMessage() {
    return `Must be between '${MINIMUM_ACCOUNT_ID_LENGTH}' and '${MAXIMUM_ACCOUNT_ID_LENGTH}' characters
An Account ID consists of Account ID parts separated by '.' (dots)
Each Account ID part consists of lowercase alphanumeric symbols separated by either a '_' (underscore) or '-' (dash)
For further information look for: https://docs.near.org/docs/concepts/account#account-id-rules`
  }

  constructor(account) {
    this.account = account
  }

  _validateLength() {
    return this.account.length >= MINIMUM_ACCOUNT_ID_LENGTH &&
      this.account.length <= MAXIMUM_ACCOUNT_ID_LENGTH
  }

  validate() {
    // Reference: https://docs.near.org/docs/concepts/account#account-id-rules
    return this._validateLength(this.account) &&
      NearContract.pattern().test(this.account)
  }
}
