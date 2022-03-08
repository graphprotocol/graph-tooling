module.exports = class TendermintContract {
  static identifierName() {
    return 'address'
  }

  validate() {
    return {
      valid: true,
      error: null,
    }
  }
}
