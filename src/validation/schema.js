const fs = require('fs')
const graphql = require('graphql/language')
const immutable = require('immutable')

const loadSchema = filename => {
  try {
    return fs.readFileSync(filename, 'utf-8')
  } catch (e) {
    throw new Error(`Failed to load GraphQL schema: ${e}`)
  }
}

const parseSchema = doc => {
  try {
    return graphql.parse(doc)
  } catch (e) {
    throw new Error(`Invalid GraphQL schema: ${e}`)
  }
}

const typeDefinitionValidators = {
  ObjectTypeDefinition: def =>
    def.directives.find(directive => directive.name.value === 'entity')
      ? immutable.fromJS([])
      : immutable.fromJS([
          {
            loc: def.loc,
            message: `Type '${def.name.value}' defined without @entity directive`,
          },
        ]),
}

const validateTypeDefinition = def =>
  typeDefinitionValidators[def.kind] !== undefined
    ? typeDefinitionValidators[def.kind](def)
    : immutable.fromJS([])

const validateTypeDefinitions = defs =>
  defs.reduce(
    (errors, def) => errors.concat(validateTypeDefinition(def)),
    immutable.fromJS([])
  )

const validateSchema = filename => {
  let doc = loadSchema(filename)
  let schema = parseSchema(doc)
  return validateTypeDefinitions(schema.definitions).toJS()
}

module.exports = { validateSchema }
