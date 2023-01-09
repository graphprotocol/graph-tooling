const TYPE_CONVERSIONS = require('./conversions')

// Conversion utilities

const conversionsForTypeSystems = (fromTypeSystem, toTypeSystem) => {
  let conversions = TYPE_CONVERSIONS[fromTypeSystem]?.[toTypeSystem]
  if (conversions === undefined) {
    throw new Error(
      `Conversions from '${fromTypeSystem}' to '${toTypeSystem}' are not supported`,
    )
  }
  return conversions
}

const objectifyConversion = (fromTypeSystem, toTypeSystem, conversion) => {
  return Object.freeze({
    from: {
      typeSystem: fromTypeSystem,
      type: conversion[0],
    },
    to: {
      typeSystem: toTypeSystem,
      type: conversion[1],
    },
    convert: conversion[2],
  })
}

const findConversionFromType = (fromTypeSystem, toTypeSystem, fromType) => {
  let conversions = conversionsForTypeSystems(fromTypeSystem, toTypeSystem)

  let conversion = conversions.find(conversion =>
    typeof conversion[0] === 'string'
      ? conversion[0] === fromType
      : fromType.match(conversion[0]),
  )

  if (conversion === undefined) {
    throw new Error(
      `Conversion from '${fromTypeSystem}' to '${toTypeSystem}' for ` +
        `source type '${fromType}' is not supported`,
    )
  }

  return objectifyConversion(fromTypeSystem, toTypeSystem, conversion)
}

const findConversionToType = (fromTypeSystem, toTypeSystem, toType) => {
  let conversions = conversionsForTypeSystems(fromTypeSystem, toTypeSystem)

  let conversion = conversions.find(conversion =>
    typeof conversion[1] === 'string'
      ? conversion[1] === toType
      : toType.match(conversion[1]),
  )

  if (conversion === undefined) {
    throw new Error(
      `Conversion from '${fromTypeSystem}' to '${toTypeSystem}' for ` +
        `target type '${toType}' is not supported`,
    )
  }

  return objectifyConversion(fromTypeSystem, toTypeSystem, conversion)
}

// High-level type system API

const ascTypeForProtocol = (protocol, protocolType) =>
  findConversionFromType(protocol, 'AssemblyScript', protocolType).to?.type

// TODO: this can be removed/replaced by the function above
const ascTypeForEthereum = ethereumType => ascTypeForProtocol('ethereum', ethereumType)

const ethereumTypeForAsc = ascType =>
  findConversionFromType('AssemblyScript', 'ethereum', ascType).to?.type

const ethereumToAsc = (code, ethereumType, internalType) =>
  findConversionFromType('ethereum', 'AssemblyScript', ethereumType).convert(
    code,
    internalType,
  )

const ethereumFromAsc = (code, ethereumType) =>
  findConversionToType('AssemblyScript', 'ethereum', ethereumType).convert(code)

const ascTypeForValue = valueType =>
  findConversionFromType('Value', 'AssemblyScript', valueType).to?.type

const valueTypeForAsc = ascType =>
  findConversionFromType('AssemblyScript', 'Value', ascType).to?.type

const valueToAsc = (code, valueType) =>
  findConversionFromType('Value', 'AssemblyScript', valueType).convert(code)

const valueFromAsc = (code, valueType) =>
  findConversionToType('AssemblyScript', 'Value', valueType).convert(code)

module.exports = {
  // protocol <-> AssemblyScript
  ascTypeForProtocol,

  // ethereum <-> AssemblyScript
  ascTypeForEthereum,
  ethereumTypeForAsc,
  ethereumToAsc,
  ethereumFromAsc,

  // Value <-> AssemblyScript
  ascTypeForValue,
  valueTypeForAsc,
  valueToAsc,
  valueFromAsc,
}
