let loadNewEntityId = (~name) =>
  `  let loaded${name} = new ${name}(entityId);
`

let setInitializeFieldValue = (~name, ~fieldName, ~fieldValue) =>
  `  loaded${name}.${fieldName} = ${fieldValue};`

let setField = (~field, ~fieldValue) =>
  `  ${field}: ${fieldValue};
`

let setFieldToNewValue = (~field) =>
  `  entity.${field} = newValues.${field};
`

let setFieldNameToFieldType = (~fieldName, ~fieldType) =>
  `  ${fieldName}: ${fieldType};
`

let getDefaultValues = typeString =>
  switch typeString {
  | "Bytes" => `Bytes.fromHexString("0x00") as Bytes`
  | "Address" => `Address.fromString("0x0000000000000000000000000000000000000000")`
  | "Int" => "0"
  | "String" => `""`
  | "BigInt" => "BigInt.zero()"
  | "BigDecimal" => "BigDecimal.zero()"
  | "Boolean" => "false"
  | unknownType => `"${unknownType} - Unknown type"`
  }

let toStringConverter = (paramName, paramType) =>
  switch paramType {
  | "Bytes" => `${paramName}.toHex()`
  | "Address" => `${paramName}.toHex()`
  | "BigInt" => `${paramName}.toString()`
  | "BigDecimal" => `${paramName}.toString()`
  | "String" => paramName
  | unknownType => `"unhandled type in converter ${unknownType} - Please fix the converter"`
  }

let unhandledTypeMessage = (~uncaught) =>
  `unhandled type ${uncaught->Obj.magic} - please write a mapper for it`

let fieldNotFoundForEntity = (~field, ~functionName, ~name) =>
  `Cannot use field '${field}' in the '${functionName}' as it does not belong to the '${name}' entity.`

let generateId = (~name, ~argsDefinition, ~idString) =>
  `export function generate${name}Id(
  ${argsDefinition}
): string {
  return ENTITY_ID_PREFIX + ${idString}
}
`

let createSetterFunction = (~functionName, ~fieldTypeDef, ~name, ~fieldTypeSetters) =>
  `export class ${functionName}Values {
${fieldTypeDef}}
` ++
  `
export function ${functionName}(entityId: string, newValues: ${functionName}Values): void {
  let entity = get${name}(entityId);
${fieldTypeSetters}
  entity.save();
}
`

let outputCode = (~entityImports, ~networkIdPrefix, ~functions) =>
  `import {
${entityImports}
} from "./schema";
import {
  Address,
  BigInt,
  Bytes,
  BigDecimal,
  log,
  Entity,
  dataSource, 
} from "@graphprotocol/graph-ts";

export let NETWORK_NAME = dataSource.network(); // e.g. "mainnet", "matic", "avalanche", "ropsten", "poa-core"

function getIdPrefix(network: string): string {
${networkIdPrefix}
}
export let ENTITY_ID_PREFIX = getIdPrefix(NETWORK_NAME);

function ensureEntityIdHasCorrectPrefix(entityId: string): string {
  if (entityId.startsWith(ENTITY_ID_PREFIX)) {
    return entityId;
  } else {
    return ENTITY_ID_PREFIX + entityId;
  }
}

export class GetOrCreateReturn<EntityType> {
  entity: EntityType;
  wasCreated: boolean;

  constructor(entity: EntityType, wasCreated: boolean) {
    this.entity = entity;
    this.wasCreated = wasCreated;
  }
}
${functions}
`

let getOrInitializeDefaultFunction = (~name, ~fieldDefaultSettersStrict) =>
  `
function getOrInitialize${name}Default(entityId: string = "UNINITIALISED - ${name}"): ${name} {
  entityId = ensureEntityIdHasCorrectPrefix(entityId);
  let loaded${name} = ${name}.load(entityId);

  if (loaded${name} == null) {
    loaded${name} = new ${name}(entityId);
    ${fieldDefaultSettersStrict}
    loaded${name}.save();

    return loaded${name};
  } else{
    return loaded${name};
  }
}
`

let entityInitialValues = (~name, ~fieldInitialValues) =>
  `export class ${name}InitialValues {
${fieldInitialValues}}
`

let createEntityFunction = (~name, ~fieldInitialValueSettersStrict, safeMode) =>
  `
export function create${name}(entityId: string, initialValues: ${name}InitialValues): ${name} {
  entityId = ensureEntityIdHasCorrectPrefix(entityId);
  if (${safeMode} && ${name}.load(entityId) != null) {
      log.warning("GRAPH UNCRASHABLE WARNING: Trying to create an entity that already exists. (entityType : ${name}, entitiyID: {})", [entityId]);

    return ${name}.load(entityId) as ${name};
  }
${fieldInitialValueSettersStrict}

  loaded${name}.save();

  return loaded${name};
}
`

let doesEntityExistFunction = (~name) =>
  `
export function does${name}Exist(entityId: string): boolean {
  entityId = ensureEntityIdHasCorrectPrefix(entityId);
  return ${name}.load(entityId) != null;
}
`

let getOrInitializeFunction = (~name) =>
  `
export function getOrInitialize${name}(entityId: string, initialValues: ${name}InitialValues): GetOrCreateReturn<${name}> {
  entityId = ensureEntityIdHasCorrectPrefix(entityId);
  let loaded${name} = ${name}.load(entityId);

  let returnObject: GetOrCreateReturn<${name}>;

  if (loaded${name} == null) {
    returnObject = new GetOrCreateReturn<${name}>(create${name}(entityId, initialValues), true);
  } else {
    returnObject = new GetOrCreateReturn<${name}>(loaded${name} as ${name}, false);
  }

  return returnObject;
}
`

let getFunction = (~name) =>
  `
export function get${name}(entityId: string): ${name} {
  entityId = ensureEntityIdHasCorrectPrefix(entityId);
  let loaded${name} = ${name}.load(entityId);

  if (loaded${name} == null) {
      log.warning("GRAPH UNCRASHABLE WARNING: Unable to find entity of type ${name} with id {}. If this entity hasn't been initialized use the 'getOrInitialize${name}' and handle the case that it needs to be initialized.", [entityId])

    return getOrInitialize${name}Default(entityId);
  }

  return loaded${name} as ${name};
}
`

let entityGeneratedCode = (
  ~idGeneratorFunction,
  ~name,
  ~fieldDefaultSettersStrict,
  ~fieldInitialValues,
  ~fieldInitialValueSettersStrict,
  ~fieldSetterFunctions,
  ~safeMode,
) =>
  idGeneratorFunction ++
  getOrInitializeDefaultFunction(~name, ~fieldDefaultSettersStrict) ++
  entityInitialValues(~name, ~fieldInitialValues) ++
  createEntityFunction(~name, ~fieldInitialValueSettersStrict, safeMode) ++
  getOrInitializeFunction(~name) ++
  doesEntityExistFunction(~name) ++
  getFunction(~name) ++
  fieldSetterFunctions
