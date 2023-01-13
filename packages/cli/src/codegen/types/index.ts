import immutable from 'immutable';
import TYPE_CONVERSIONS from './conversions';

// Conversion utilities

const conversionsForTypeSystems = (fromTypeSystem: string, toTypeSystem: string) => {
  const conversions = TYPE_CONVERSIONS.getIn([fromTypeSystem, toTypeSystem]);
  if (conversions === undefined) {
    throw new Error(`Conversions from '${fromTypeSystem}' to '${toTypeSystem}' are not supported`);
  }
  return conversions as immutable.Collection<any, any>;
};

const objectifyConversion = (
  fromTypeSystem: string,
  toTypeSystem: string,
  conversion: immutable.Collection<any, any>,
) => {
  return immutable.fromJS({
    from: {
      typeSystem: fromTypeSystem,
      type: conversion.get(0),
    },
    to: {
      typeSystem: toTypeSystem,
      type: conversion.get(1),
    },
    convert: conversion.get(2),
  });
};

const findConversionFromType = (
  fromTypeSystem: string,
  toTypeSystem: string,
  fromType: string,
): immutable.Collection<any, any> => {
  const conversions = conversionsForTypeSystems(fromTypeSystem, toTypeSystem);

  const conversion = conversions.find(conversion =>
    typeof conversion.get(0) === 'string'
      ? conversion.get(0) === fromType
      : !!fromType.match(conversion.get(0)),
  );

  if (conversion === undefined) {
    throw new Error(
      `Conversion from '${fromTypeSystem}' to '${toTypeSystem}' for ` +
        `source type '${fromType}' is not supported`,
    );
  }

  return objectifyConversion(fromTypeSystem, toTypeSystem, conversion);
};

const findConversionToType = (
  fromTypeSystem: string,
  toTypeSystem: string,
  toType: string,
): immutable.Collection<any, any> => {
  const conversions = conversionsForTypeSystems(fromTypeSystem, toTypeSystem);

  const conversion = conversions.find(conversion =>
    typeof conversion.get(1) === 'string'
      ? conversion.get(1) === toType
      : !!toType.match(conversion.get(1)),
  );

  if (conversion === undefined) {
    throw new Error(
      `Conversion from '${fromTypeSystem}' to '${toTypeSystem}' for ` +
        `target type '${toType}' is not supported`,
    );
  }

  return objectifyConversion(fromTypeSystem, toTypeSystem, conversion);
};

// High-level type system API

export const ascTypeForProtocol = (protocol: string, protocolType: string) =>
  findConversionFromType(protocol, 'AssemblyScript', protocolType).getIn(['to', 'type']) as string;

// TODO: this can be removed/replaced by the function above
export const ascTypeForEthereum = (ethereumType: string) =>
  ascTypeForProtocol('ethereum', ethereumType);

export const ethereumTypeForAsc = (ascType: string) =>
  findConversionFromType('AssemblyScript', 'ethereum', ascType).getIn(['to', 'type']) as
    | string
    | RegExp;

export const ethereumToAsc = (code: string, ethereumType: string, internalType?: string) =>
  findConversionFromType('ethereum', 'AssemblyScript', ethereumType).get('convert')(
    code,
    internalType,
  );

export const ethereumFromAsc = (code: string, ethereumType: string) =>
  findConversionToType('AssemblyScript', 'ethereum', ethereumType).get('convert')(code);

export const ascTypeForValue = (valueType: string) =>
  findConversionFromType('Value', 'AssemblyScript', valueType).getIn(['to', 'type']);

export const valueTypeForAsc = (ascType: string) =>
  findConversionFromType('AssemblyScript', 'Value', ascType).getIn(['to', 'type']);

export const valueToAsc = (code: string, valueType: string) =>
  findConversionFromType('Value', 'AssemblyScript', valueType).get('convert')(code);

export const valueFromAsc = (code: string, valueType: string) =>
  findConversionToType('AssemblyScript', 'Value', valueType).get('convert')(code);
