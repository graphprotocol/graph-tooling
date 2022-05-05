const prettier = require('prettier')
const graphql = require('graphql/language')
const immutable = require('immutable')
const SchemaCodeGenerator = require('./schema')
const {
  Class,
  Method,
  StaticMethod,
  Param,
  NamedType,
  NullableType,
  ArrayType,
} = require('./typescript')

const formatTS = code =>
  prettier.format(
    code,
    { parser: 'typescript', semi: false }
  )

const createSchemaCodeGen = schema =>
  new SchemaCodeGenerator({
    ast: immutable.fromJS(graphql.parse(schema)),
  })

const testEntity = (generatedTypes, expectedEntity) => {
  const entity = generatedTypes.find(type => type.name === expectedEntity.name)

  expect(entity instanceof Class).toBe(true)
  expect(entity.extends).toBe('Entity')
  expect(entity.export).toBe(true)

  const { members, methods } = entity

  expect(members).toStrictEqual(expectedEntity.members)

  for (const expectedMethod of expectedEntity.methods) {
    const method = methods.find(method => method.name === expectedMethod.name)

    expectedMethod.static
      ? expect(method instanceof StaticMethod).toBe(true)
      : expect(method instanceof Method).toBe(true)

    expect(method.params).toStrictEqual(expectedMethod.params)
    expect(method.returnType).toStrictEqual(expectedMethod.returnType)
    expect(formatTS(method.body)).toBe(formatTS(expectedMethod.body))
  }

  expect(methods.length).toBe(expectedEntity.methods.length)
}

describe('Schema code generator', () => {
  test('Should generate nothing for non entity types', () => {
    const codegen = createSchemaCodeGen(`
      type Foo {
        foobar: Int
      }

      type Bar {
        barfoo: Int
      }
    `)

    expect(codegen.generateTypes().size).toBe(0)
  })

  describe('Should generate correct classes for each entity', () => {
    const codegen = createSchemaCodeGen(`
      # just to be sure nothing will be generated from non-entity types alongside regular ones
      type Foo {
        foobar: Int
      }

      type Account @entity {
        id: ID!

        # two non primitive types
        description: String
        name: String!

        # two primitive types (i32)
        age: Int
        count: Int!

        # derivedFrom
        wallets: [Wallet!] @derivedFrom(field: "account")
      }

      type Wallet @entity {
        id: ID!
        amount: BigInt!
        account: Account!
      }
    `)

    const generatedTypes = codegen.generateTypes()

    test('Foo is NOT an entity', () => {
      const foo = generatedTypes.find(type => type.name === 'Foo')
      expect(foo).toBe(undefined)
      // Account and Wallet
      expect(generatedTypes.size).toBe(2)
    })

    test('Account is an entity with the correct methods', () => {
      testEntity(generatedTypes, {
        name: 'Account',
        members: [],
        methods: [
          {
            name: 'constructor',
            params: [new Param('id', new NamedType('string'))],
            returnType: undefined,
            body: `
              super()
              this.set('id', Value.fromString(id))
            `,
          },
          {
            name: 'save',
            params: [],
            returnType: new NamedType('void'),
            body: `
              let id = this.get('id')
              assert(id != null, 'Cannot save Account entity without an ID')
              if (id) {
                assert(
                  id.kind == ValueKind.STRING,
                  \`Entities of type Account must have an ID of type String but the id '\${id.displayData()}' is of type \${id.displayKind()}\`)
                store.set('Account', id.toString(), this)
              }
            `,
          },
          {
            name: 'load',
            static: true,
            params: [new Param('id', new NamedType('string'))],
            returnType: new NullableType(new NamedType('Account')),
            body: `
              return changetype<Account | null>(store.get('Account', id))
            `,
          },
          {
            name: 'get id',
            params: [],
            returnType: new NamedType('string'),
            body: `
              let value = this.get('id')
              return value!.toString()
            `,
          },
          {
            name: 'set id',
            params: [new Param('value', new NamedType('string'))],
            returnType: undefined,
            body: `
              this.set('id', Value.fromString(value))
            `,
          },
          {
            name: 'get description',
            params: [],
            returnType: new NullableType(new NamedType('string')),
            body: `
              let value = this.get('description')
              if (!value || value.kind == ValueKind.NULL) {
                return null
              } else {
                return value.toString()
              }
            `,
          },
          {
            name: 'set description',
            params: [new Param('value', new NullableType(new NamedType('string')))],
            returnType: undefined,
            body: `
              if (!value) {
                this.unset('description')
              } else {
                this.set('description', Value.fromString(<string>value))
              }
            `,
          },
          {
            name: 'get name',
            params: [],
            returnType: new NamedType('string'),
            body: `
              let value = this.get('name')
              return value!.toString()
            `,
          },
          {
            name: 'set name',
            params: [new Param('value', new NamedType('string'))],
            returnType: undefined,
            body: `
              this.set('name', Value.fromString(value))
            `,
          },
          {
            name: 'get age',
            params: [],
            returnType: new NamedType('i32'),
            body: `
              let value = this.get('age')
              return value!.toI32()
            `,
          },
          {
            name: 'set age',
            params: [new Param('value', new NamedType('i32'))],
            returnType: undefined,
            body: `
              this.set('age', Value.fromI32(value))
            `,
          },
          {
            name: 'get count',
            params: [],
            returnType: new NamedType('i32'),
            body: `
              let value = this.get('count')
              return value!.toI32()
            `,
          },
          {
            name: 'set count',
            params: [new Param('value', new NamedType('i32'))],
            returnType: undefined,
            body: `
              this.set('count', Value.fromI32(value))
            `,
          },
          {
            name: 'get wallets',
            params: [],
            returnType: new NullableType(new ArrayType(new NamedType('string'))),
            body: `
              let value = this.get('wallets')
              if (!value || value.kind == ValueKind.NULL) {
                return null
              } else {
                return value.toStringArray()
              }
            `,
          },
          {
            name: 'set wallets',
            params: [new Param('value', new NullableType(new ArrayType(new NamedType('string'))))],
            returnType: undefined,
            body: `
              if (!value) {
                this.unset('wallets')
              } else {
                this.set('wallets', Value.fromStringArray(<Array<string>>value))
              }
            `,
          },
        ],
      })
    })

    test('Wallet is an entity with the correct methods', () => {
      testEntity(generatedTypes, {
        name: 'Wallet',
        members: [],
        methods: [
          {
            name: 'constructor',
            params: [new Param('id', new NamedType('string'))],
            returnType: undefined,
            body: `
              super()
              this.set('id', Value.fromString(id))
            `,
          },
          {
            name: 'save',
            params: [],
            returnType: new NamedType('void'),
            body: `
              let id = this.get('id')
              assert(id != null, 'Cannot save Wallet entity without an ID')
              if (id) {
                assert(
                  id.kind == ValueKind.STRING,
                  \`Entities of type Wallet must have an ID of type String but the id '\${id.displayData()}' is of type \${id.displayKind()}\`)
                store.set('Wallet', id.toString(), this)
              }
            `,
          },
          {
            name: 'load',
            static: true,
            params: [new Param('id', new NamedType('string'))],
            returnType: new NullableType(new NamedType('Wallet')),
            body: `
              return changetype<Wallet | null>(store.get('Wallet', id))
            `,
          },
          {
            name: 'get id',
            params: [],
            returnType: new NamedType('string'),
            body: `
              let value = this.get('id')
              return value!.toString()
            `,
          },
          {
            name: 'set id',
            params: [new Param('value', new NamedType('string'))],
            returnType: undefined,
            body: `
              this.set('id', Value.fromString(value))
            `,
          },
          {
            name: 'get amount',
            params: [],
            returnType: new NamedType('BigInt'),
            body: `
              let value = this.get('amount')
              return value!.toBigInt()
            `,
          },
          {
            name: 'set amount',
            params: [new Param('value', new NamedType('BigInt'))],
            returnType: undefined,
            body: `
              this.set('amount', Value.fromBigInt(value))
            `,
          },
          {
            name: 'get account',
            params: [],
            returnType: new NamedType('string'),
            body: `
              let value = this.get('account')
              return value!.toString()
            `,
          },
          {
            name: 'set account',
            params: [new Param('value', new NamedType('string'))],
            returnType: undefined,
            body: `
              this.set('account', Value.fromString(value))
            `,
          },
        ],
      })
    })
  })
})
