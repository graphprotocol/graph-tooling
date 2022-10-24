%%raw(`require('graphql-import-node/register')`)
@val external requireGqlFile: string => 'a = "require"
let errors: Js.Array2.t<string> = []

type enumItem
let enumsMap: Js.Dict.t<enumItem> = Js.Dict.empty()
type interfaceItem
let interfacesMap: Js.Dict.t<interfaceItem> = Js.Dict.empty()
type entityItem
let entitiesMap: Js.Dict.t<entityItem> = Js.Dict.empty()
type configEntityItem
let configEntityMap: Js.Dict.t<configEntityItem> = Js.Dict.empty()

let confirmTypeIsSupported = argType => {
  switch argType {
  | "String"
  | "Int"
  | "BigInt"
  | "Bytes"
  | "constant"
  | "BigDecimal" => true
  | uncaught => false
  }
}

let getNamedType = name => {
  switch name["value"] {
  | #String => "string"
  | #Int => "i32"
  | #BigInt => "BigInt"
  | #Bytes => "Bytes"
  | #Boolean => "boolean"
  | #BigDecimal => "BigDecimal"
  | uncaught =>
    let nonStandardTypeString = uncaught->Obj.magic

    if configEntityMap->Js.Dict.get(nonStandardTypeString)->Option.isSome {
      nonStandardTypeString
    } else {
      let _ = errors->Js.Array2.push(`Unexpected entity param: in uncrashable-config.yaml`)
      "Unhandled"
    }
  }
}

let rec validateFieldType = (~config, ~fieldName, field) => {
  switch field["type"]["kind"] {
  | #NamedType => {
      let fieldType = field["type"]["name"]->getNamedType
      (fieldType, false)
    }
  | #ListType =>
    let (fieldType, _) = field["type"]->validateFieldType(~config, ~fieldName)
    (fieldType, true)

  | #NonNullType =>
    if config->Js.Dict.get(fieldName)->Option.isSome {
      field["type"]->validateFieldType(~config, ~fieldName)
    } else {
      let _ = errors->Js.Array2.push(`Missing field: ${fieldName} in uncrashable-config.yaml`)
      ("unhandled", false)
    }
  | uncaught => ("uncaught", false)
  }
}

let rec validateValue = (~config, ~rootName) => {
  if configEntityMap->Js.Dict.get(rootName)->Option.isSome {
    let entity = configEntityMap->Js.Dict.unsafeGet(rootName)->Obj.magic
    let kind = entity["kind"]
    let fields = entity["fields"]

    let fieldsMap = Js.Dict.empty()
    let _ = fields->Array.map(field => {
      let fieldName = field["name"]["value"]
      fieldsMap->Js.Dict.set(fieldName, field)
    })

    let _ =
      fieldsMap
      ->Js.Dict.keys
      ->Array.map(fieldName => {
        let field = fieldsMap->Js.Dict.unsafeGet(fieldName)->Obj.magic
        if config->Js.Dict.get(fieldName)->Option.isSome {
          let configEntity = config->Js.Dict.unsafeGet(fieldName)->Obj.magic
          let (fieldType, isList) = field->validateFieldType(~config, ~fieldName)
          if isList {
            if configEntity->Array.length > 0 {
              let _ = configEntity->Array.map(listItem => {
                let _ = validateValue(~config=listItem, ~rootName=fieldType)
              })
            } else {
              let _ =
                errors->Js.Array2.push(
                  `Missing elements for field: ${fieldName} in uncrashable-config.yaml`,
                )
            }
          } else {
            let _ = validateValue(~config=configEntity, ~rootName=fieldType)
          }
        } else {
          let _ = field->validateFieldType(~config, ~fieldName)
        }
      })

    let _ =
      config
      ->Js.Dict.keys
      ->Array.map(entityName => {
        if fieldsMap->Js.Dict.get(entityName)->Option.isSome {
          ()
        } else if entitiesMap->Js.Dict.get(entityName)->Option.isSome {
          //handle the case where its an entity name
          ()
        } else {
          let _ =
            errors->Js.Array2.push(`Unexpected field: ${entityName} in uncrashable-config.yaml`)
        }
      })
  }
}

let validateSchema = (~config) => {
  let entitySettings = config->Js.Dict.get("entitySettings")->Option.getWithDefault(Js.Dict.empty())
  let _ =
    entitySettings
    ->Js.Dict.keys
    ->Array.map(entityName => {
      if entitiesMap->Js.Dict.get(entityName)->Option.isSome {
        ()
      } else {
        let _ =
          errors->Js.Array2.push(`Unexpected entity: ${entityName} in uncrashable-config.yaml`)
      }
    })
  let _ =
    entitiesMap
    ->Js.Dict.keys
    ->Array.map(entityName => {
      let entity = entitiesMap->Js.Dict.unsafeGet(entityName)->Obj.magic
      let name = entity["name"]["value"]

      let fields = entity["fields"]
      let fieldsMap = Js.Dict.empty()
      let _ = fields->Array.map(field => {
        let fieldName = field["name"]["value"]
        fieldsMap->Js.Dict.set(fieldName, field)
      })
      let _ =
        entitySettings
        ->Js.Dict.get(name)
        ->Option.map(configEntity => {
          let _ =
            configEntity
            ->Js.Dict.get("setters")
            ->Option.map(setterFunctions => {
              let functions = setterFunctions->Array.map(setter => {
                let functionName = setter["name"]
                let functionSetterFields = setter["fields"]->Option.getWithDefault([])
                if (
                  functionSetterFields->Js.Array.isArray && functionSetterFields->Array.length > 0
                ) {
                  let fieldTypeDef = functionSetterFields->Array.map(field => {
                    if fieldsMap->Js.Dict.get(field)->Option.isSome {
                      ()
                    } else {
                      let _ =
                        errors->Js.Array2.push(
                          `Unexpected field ${field} in setter: ${functionName}, entity: ${entityName}`,
                        )
                    }
                  })
                } else {
                  let _ =
                    errors->Js.Array2.push(
                      `Missing setter fields for ${functionName}, entity: ${entityName}`,
                    )
                }
              })
            })
            ->Option.getWithDefault()

          let _ =
            configEntity
            ->Js.Dict.get("entityId")
            ->Option.map(idArgs => {
              let _ = idArgs->Array.map(arg => {
                let argType = arg["type"]->Option.getWithDefault("")
                if !confirmTypeIsSupported(argType) {
                  let _ =
                    errors->Js.Array2.push(
                      `Unsupported entityId type ${argType}, variable name: ${arg["name"]}, entity: ${entityName}`,
                    )
                }
              })
            })
            ->Option.getWithDefault()
        })
    })
}

let validate = (~entityDefinitions, ~uncrashableConfig) => {
  let file = "./uncrashable.graphql"

  let uncrashableConfigTemplate = requireGqlFile(file)

  let configTemplateDefinitions = uncrashableConfigTemplate["definitions"]

  entityDefinitions->Array.forEach(entity => {
    let name = entity["name"]["value"]

    let entityKind = entity["kind"]

    let _ = switch entityKind {
    | #EnumTypeDefinition => enumsMap->Js.Dict.set(name, entity->Obj.magic)
    | #InterfaceTypeDefinition => interfacesMap->Js.Dict.set(name, entity->Obj.magic)
    | #ObjectTypeDefinition => entitiesMap->Js.Dict.set(name, entity->Obj.magic)
    }
  })

  configTemplateDefinitions->Array.forEach(entity => {
    let name = entity["name"]["value"]

    let entityKind = entity["kind"]

    let _ = switch entityKind {
    | #EnumTypeDefinition => enumsMap->Js.Dict.set(name, entity->Obj.magic)
    | #InterfaceTypeDefinition => interfacesMap->Js.Dict.set(name, entity->Obj.magic)
    | #ObjectTypeDefinition => configEntityMap->Js.Dict.set(name, entity->Obj.magic)
    }
  })

  let _ = validateValue(~config=uncrashableConfig, ~rootName="UncrashableConfig")
  let _ = validateSchema(~config=uncrashableConfig)

  errors
}
