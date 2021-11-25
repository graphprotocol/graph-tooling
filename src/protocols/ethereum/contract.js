module.exports = class EthereumContract {
  static identifierName() {
    return 'address'
  }

  static pattern() {
    return /^(0x)?[0-9a-fA-F]{40}$/
  }

  static errorMessage() {
    return "Must be 40 hexadecimal characters, with an optional '0x' prefix."
  }

  constructor(address) {
    this.address = address
  }

  validate() {
    return EthereumContract.pattern().test(this.address)
  }
}
