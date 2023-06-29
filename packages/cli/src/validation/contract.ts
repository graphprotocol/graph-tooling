import Protocol from '../protocols';
import { ContractCtor } from '../protocols/contract';
import { ManifestZodSchema } from '../manifest';

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

export const validateContractValues = (manifest: ManifestZodSchema, protocol: Protocol) => {
  const ProtocolContract = protocol.getContract()!;

  const fieldName = ProtocolContract.identifierName();

  return manifest.dataSources
    .filter(datasource => protocol.isValidKindName(datasource.kind))
    .reduce((errors: any, dataSource, dataSourceIndex) => {
      const path = ['dataSources', dataSourceIndex, 'source', fieldName];

      // No need to validate if the source has no contract field
      // @ts-expect-error TODO: we need to rework the classes to make this `fieldName` not be a string
      if (!dataSource.source[fieldName]) {
        return errors;
      }

      // @ts-expect-error TODO: we need to rework the classes to make this `fieldName` not be a string
      const contractValue = dataSource.source[fieldName];

      const { valid, error } = validateContract(contractValue, ProtocolContract);

      // Validate whether the contract is valid for the protocol
      if (valid) {
        return errors;
      }

      return errors.push({
        path,
        message: error,
      });
    }, []);
};
