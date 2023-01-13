import { Contract } from '../contract';

export default class EthereumContract implements Contract {
  static identifierName() {
    return 'address';
  }

  constructor(private address: string) {
    this.address = address;
  }

  validate() {
    const pattern = /^(0x)?[0-9a-fA-F]{40}$/;

    const errorMessage = "Must be 40 hexadecimal characters, with an optional '0x' prefix.";

    const valid = pattern.test(this.address);

    return {
      valid,
      error: valid ? null : errorMessage,
    };
  }
}
