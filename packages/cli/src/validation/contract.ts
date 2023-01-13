import immutable from 'immutable';
import Protocol from '../protocols';
import { ContractCtor } from '../protocols/contract';

export const validateContract = (value: string, ProtocolContract: ContractCtor) => {
  const contract = new ProtocolContract(value);

  const { valid, error } = contract.validate();

  if (!valid) {
    return {
      valid,
      error: `Contract ${ProtocolContract.identifierName()} is invalid: ${value}\n${error}`,
    };
  }

  return { valid, error };
};

export const validateContractValues = (manifest: immutable.Map<any, any>, protocol: Protocol) => {
  const ProtocolContract = protocol.getContract()!;

  const fieldName = ProtocolContract.identifierName();

  return manifest
    .get('dataSources')
    .filter((dataSource: any) => protocol.isValidKindName(dataSource.get('kind')))
    .reduce((errors: any[], dataSource: any, dataSourceIndex: number) => {
      const path = ['dataSources', dataSourceIndex, 'source', fieldName];

      // No need to validate if the source has no contract field
      if (!dataSource.get('source').has(fieldName)) {
        return errors;
      }

      const contractValue = dataSource.getIn(['source', fieldName]);

      const { valid, error } = validateContract(contractValue, ProtocolContract);

      // Validate whether the contract is valid for the protocol
      if (valid) {
        return errors;
      }
      return errors.push(
        immutable.fromJS({
          path,
          message: error,
        }),
      );
    }, immutable.List());
};
