import { Contract } from '../contract';

const MINIMUM_ACCOUNT_ID_LENGTH = 2 as const;
const MAXIMUM_ACCOUNT_ID_LENGTH = 64 as const;

const RULES_URL = 'https://docs.near.org/docs/concepts/account#account-id-rules' as const;

export default class NearContract implements Contract {
  static identifierName() {
    return 'account';
  }

  constructor(private account: string) {
    this.account = account;
  }

  private validateLength(value: string) {
    return value.length >= MINIMUM_ACCOUNT_ID_LENGTH && value.length <= MAXIMUM_ACCOUNT_ID_LENGTH;
  }

  private validateFormat(value: string) {
    const pattern = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

    return pattern.test(value);
  }

  validate() {
    if (!this.validateLength(this.account)) {
      return {
        valid: false,
        error: `Account must be between '${MINIMUM_ACCOUNT_ID_LENGTH}' and '${MAXIMUM_ACCOUNT_ID_LENGTH}' characters, see ${RULES_URL}`,
      };
    }

    if (!this.validateFormat(this.account)) {
      return {
        valid: false,
        error: `Account must conform to the rules on ${RULES_URL}`,
      };
    }

    return {
      valid: true,
      error: null,
    };
  }
}
