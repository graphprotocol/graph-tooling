import assert from 'assert';
import * as graphql from 'graphql/language';
import prettier from 'prettier';
import { describe, expect, test } from 'vitest';
import Schema from '../schema';
import SchemaCodeGenerator from './schema';
import { Class, Method, NamedType, NullableType, Param, StaticMethod } from './typescript';

const formatTS = async (code: string) =>
  await prettier.format(code, { parser: 'typescript', semi: false });

const createSchemaCodeGen = (schema: string) =>
  new SchemaCodeGenerator(new Schema('', schema, graphql.parse(schema)));

const testEntity = async (generatedTypes: any[], expectedEntity: any) => {
  const entity = generatedTypes.find(type => type.name === expectedEntity.name);

  expect(entity instanceof Class).toBe(true);
  expect(entity.extends).toBe('Entity');
  expect(entity.export).toBe(true);

  const { members, methods } = entity;

  expect(members).toStrictEqual(expectedEntity.members);

  for (const expectedMethod of expectedEntity.methods) {
    const method = methods.find((method: any) => method.name === expectedMethod.name);

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    expectedMethod.static
      ? expect(method instanceof StaticMethod).toBe(true)
      : expect(method instanceof Method).toBe(true);
    expect(method.params).toStrictEqual(expectedMethod.params);
    expect(method.returnType).toStrictEqual(expectedMethod.returnType);
    expect(await formatTS(method.body)).toBe(await formatTS(expectedMethod.body));
  }

  expect(methods.length).toBe(expectedEntity.methods.length);
};

describe.concurrent('Schema code generator', () => {
  test('Should generate nothing for non entity types', () => {
    const codegen = createSchemaCodeGen(`
      type Foo {
        foobar: Int
      }

      type Bar {
        barfoo: Int
      }
    `);

    expect(codegen.generateTypes().length).toBe(0);
  });

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
        isActive: Boolean

        # derivedFrom
        wallets: [Wallet!] @derivedFrom(field: "account")

        # New scalars
        int8: Int8!
      }

      type Wallet @entity {
        id: ID!
        amount: BigInt!
        account: Account!
      }
    `);

    const generatedTypes = codegen.generateTypes();

    test('Foo is NOT an entity', () => {
      const foo = generatedTypes.find((type: any) => type.name === 'Foo');
      expect(foo).toBe(undefined);
      // Account and Wallet
      expect(generatedTypes.length).toBe(2);
    });

    test('Account is an entity with the correct methods', async () => {
      await testEntity(generatedTypes, {
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
            name: 'loadInBlock',
            static: true,
            params: [new Param('id', new NamedType('string'))],
            returnType: new NullableType(new NamedType('Account')),
            body: `
              return changetype<Account | null>(store.get_in_block('Account', id))
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
            body: `let value = this.get('id')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toString()
            }
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
            body: `let value = this.get('name')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toString()
            }
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
            body: `let value = this.get('age')
            if (!value || value.kind == ValueKind.NULL) {
              return 0
            } else {
              return value.toI32()
            } 
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
            body: `let value = this.get('count')
            if (!value || value.kind == ValueKind.NULL) {
              return 0
            } else {
              return value.toI32()
            }
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
            name: 'get isActive',
            params: [],
            returnType: new NamedType('boolean'),
            body: `let value = this.get('isActive')
            if (!value || value.kind == ValueKind.NULL) {
              return false
            } else {
              return value.toBoolean()
            }
            `,
          },
          {
            name: 'set isActive',
            params: [new Param('value', new NamedType('boolean'))],
            returnType: undefined,
            body: `
              this.set('isActive', Value.fromBoolean(value))
            `,
          },
          {
            name: 'get int8',
            params: [],
            returnType: new NamedType('i64'),
            body: `let value = this.get('int8')
            if (!value || value.kind == ValueKind.NULL) {
              return 0
            } else {
              return value.toI64()
            }
            `,
          },
          {
            name: 'set int8',
            params: [new Param('value', new NamedType('i64'))],
            returnType: undefined,
            body: `
              this.set('int8', Value.fromI64(value))
            `,
          },
          {
            name: 'get wallets',
            params: [],
            returnType: new NamedType('WalletLoader'),
            body: `
              return new WalletLoader("Account", this.get('id')!.toString(), "wallets") 
            `,
          },
        ],
      });
    });

    test('Wallet is an entity with the correct methods', async () => {
      await testEntity(generatedTypes, {
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
            name: 'loadInBlock',
            static: true,
            params: [new Param('id', new NamedType('string'))],
            returnType: new NullableType(new NamedType('Wallet')),
            body: `
              return changetype<Wallet | null>(store.get_in_block('Wallet', id))
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
            body: `let value = this.get('id')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toString()
            }
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
            body: `let value = this.get('amount')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toBigInt()
            }
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
            body: `let value = this.get('account')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toString()
            }
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
      });
    });
  });

  test('Should handle references with Bytes id types', async () => {
    const codegen = createSchemaCodeGen(`
    interface Employee {
      id: Bytes!
      name: String!
     }

    type Worker implements Employee @entity {
      id: Bytes!
      name: String!
      tasks: [Task!]
   }

    type Task @entity {
      id: Bytes!
      employee: Employee!
      workers: [Worker!] @derivedFrom(field: "tasks")
      worker: Worker!
   }
`);

    const generatedTypes = codegen.generateTypes();
    await testEntity(generatedTypes, {
      name: 'Task',
      members: [],
      methods: [
        {
          name: 'constructor',
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: undefined,
          body: "\n      super()\n      this.set('id', Value.fromBytes(id))\n      ",
        },
        {
          name: 'save',
          params: [],
          returnType: new NamedType('void'),
          body:
            '\n' +
            "        let id = this.get('id')\n" +
            '        assert(id != null,\n' +
            "               'Cannot save Task entity without an ID')\n" +
            '        if (id) {\n' +
            '          assert(id.kind == ValueKind.BYTES,\n' +
            "                 `Entities of type Task must have an ID of type Bytes but the id '${id.displayData()}' is of type ${id.displayKind()}`)\n" +
            "          store.set('Task', id.toBytes().toHexString(), this)\n" +
            '        }',
        },
        {
          name: 'loadInBlock',
          static: true,
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: new NullableType(new NamedType('Task')),
          body:
            '\n' +
            "        return changetype<Task | null>(store.get_in_block('Task', id.toHexString()))\n" +
            '        ',
        },
        {
          name: 'load',
          static: true,
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: new NullableType(new NamedType('Task')),
          body:
            '\n' +
            "        return changetype<Task | null>(store.get('Task', id.toHexString()))\n" +
            '        ',
        },
        {
          name: 'get id',
          params: [],
          returnType: new NamedType('Bytes'),
          body: `let value = this.get("id")
            if (!value || value.kind == ValueKind.NULL) {
               throw new Error("Cannot return null for a required field.")
             } else {
               return value.toBytes()
             }`,
        },
        {
          name: 'set id',
          params: [new Param('value', new NamedType('Bytes'))],
          returnType: undefined,
          body: "\n      this.set('id', Value.fromBytes(value))\n    ",
        },
        {
          name: 'get employee',
          params: [],
          returnType: new NamedType('Bytes'),
          body: `let value = this.get('employee')
            if (!value || value.kind == ValueKind.NULL) {
              throw new Error("Cannot return null for a required field.")
            } else {
              return value.toBytes()
            }`,
        },
        {
          name: 'set employee',
          params: [new Param('value', new NamedType('Bytes'))],
          returnType: undefined,
          body: "\n      this.set('employee', Value.fromBytes(value))\n    ",
        },
        {
          name: 'get worker',
          params: [],
          returnType: new NamedType('Bytes'),
          body: `let value = this.get('worker')
          if (!value || value.kind == ValueKind.NULL) {
            throw new Error("Cannot return null for a required field.")
          } else {
            return value.toBytes()
          }`,
        },
        {
          name: 'set worker',
          params: [new Param('value', new NamedType('Bytes'))],
          returnType: undefined,
          body: "\n      this.set('worker', Value.fromBytes(value))\n    ",
        },
        {
          name: 'get workers',
          params: [],
          returnType: new NamedType('WorkerLoader'),
          body: "\n      return new WorkerLoader('Task', this.get('id')!.toBytes().toHexString(), 'workers')\n    ",
        },
      ],
    });
  });

  test('get related method for WithBytes entity', async () => {
    const codegen = createSchemaCodeGen(`
      type WithBytes @entity {
        id: Bytes!
        related: [RelatedBytes!]! @derivedFrom(field: "related")
      }
      
      type RelatedBytes @entity {
        id: ID!
        related: WithBytes!
      }
    `);

    const generatedTypes = codegen.generateTypes();

    await testEntity(generatedTypes, {
      name: 'WithBytes',
      members: [],
      methods: [
        {
          name: 'constructor',
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: undefined,
          body: `
          super()
          this.set('id', Value.fromBytes(id));`,
        },
        {
          name: 'save',
          params: [],
          returnType: new NamedType('void'),
          body: `
            let id = this.get('id');
            assert(id != null, 'Cannot save WithBytes entity without an ID');
            if (id) {
              assert(id.kind == ValueKind.BYTES, \`Entities of type WithBytes must have an ID of type Bytes but the id '\${id.displayData()}' is of type \${id.displayKind()}\`);
              store.set('WithBytes', id.toBytes().toHexString(), this);
            }
          `,
        },

        {
          name: 'load',
          static: true,
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: new NullableType(new NamedType('WithBytes')),
          body: `return changetype<WithBytes | null>(store.get('WithBytes', id.toHexString()));`,
        },
        {
          name: 'loadInBlock',
          static: true,
          params: [new Param('id', new NamedType('Bytes'))],
          returnType: new NullableType(new NamedType('WithBytes')),
          body: `return changetype<WithBytes | null>(store.get_in_block('WithBytes', id.toHexString()));`,
        },
        {
          name: 'get id',
          params: [],
          returnType: new NamedType('Bytes'),
          body: `let value = this.get("id")
          if (!value || value.kind == ValueKind.NULL) {
            throw new Error("Cannot return null for a required field.")
          } else {
            return value.toBytes()
          }
          `,
        },
        {
          name: 'set id',
          params: [new Param('value', new NamedType('Bytes'))],
          returnType: undefined,
          body: `this.set('id', Value.fromBytes(value));`,
        },
        {
          name: 'get related',
          params: [],
          returnType: new NamedType('RelatedBytesLoader'),
          body: `return new RelatedBytesLoader('WithBytes', this.get('id')!.toBytes().toHexString(), 'related');`,
        },
        // Add any additional getters and setters for other fields if necessary
      ],
    });
  });

  test('no derived loader for interface', () => {
    const codegen = createSchemaCodeGen(`
    interface IExample {
      id: ID! 
      main: Main!
      num: Int!
    }
    
    type Example1 implements IExample @entity {
      id: ID! 
      main: Main!
      num: Int!
    }
    
    type Main @entity {
      id: ID!
      examples: [IExample!]! @derivedFrom(field: "main")
    }
`);

    const generateDerivedLoaders = codegen.generateDerivedLoaders().filter(Boolean);
    assert(generateDerivedLoaders.length === 0);
  });
});
