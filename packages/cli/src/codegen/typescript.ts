class Param {
  constructor(public name: string, public type: NamedType) {
    this.name = name
    this.type = type
  }

  toString() {
    return `${this.name}: ${this.type.toString()}`
  }
}

class Method {
  constructor(
    public name: string,
    public params: Param[],
    public returnType: NamedType | undefined,
    public body: string,
  ) {
    this.name = name
    this.params = params || []
    this.returnType = returnType
    this.body = body || ''
  }

  toString() {
    return `
  ${this.name}(${this.params.map(param => param.toString()).join(', ')})${
      this.returnType ? `: ${this.returnType.toString()}` : ''
    } {${this.body}
  }
`
  }
}

class StaticMethod {
  constructor(
    public name: string,
    public params: Param[],
    public returnType: NamedType | NullableType,
    public body: string,
  ) {
    this.name = name
    this.params = params || []
    this.returnType = returnType || 'void'
    this.body = body || ''
  }

  toString() {
    return `
  static ${this.name}(${this.params.map(param => param.toString()).join(', ')})${
      this.returnType ? `: ${this.returnType.toString()}` : ''
    } {${this.body}
  }
`
  }
}

interface ClassOptions {
  extends?: string
  export?: boolean
}

class Class {
  public extends: string | undefined
  public methods: string[]
  public members: any[]
  public export: boolean

  constructor(public name: string, options: ClassOptions) {
    this.name = name
    this.extends = options.extends
    this.methods = []
    this.members = []
    this.export = options.export || false
  }

  addMember(member: any) {
    this.members.push(member)
  }

  addMethod(method: any) {
    this.methods.push(method)
  }

  toString() {
    return `
${this.export ? 'export' : ''} class ${this.name}${
      this.extends ? ` extends ${this.extends}` : ''
    } {
${this.members.map(member => member.toString()).join('\n')}
${this.methods.map(method => method.toString()).join('')}
}
`
  }
}

class ClassMember {
  constructor(public name: string, public type: string) {
    this.name = name
    this.type = type
  }

  toString() {
    return `  ${this.name}: ${this.type.toString()}`
  }
}

class NamedType {
  constructor(public name: string) {
    this.name = name
  }

  toString() {
    return this.name
  }

  capitalize() {
    this.name = this.name.charAt(0).toUpperCase() + this.name.slice(1)
    return this
  }

  isPrimitive() {
    let primitives = [
      'boolean',
      'u8',
      'i8',
      'u16',
      'i16',
      'u32',
      'i32',
      'u64',
      'i64',
      'f32',
      'f64',
      'usize',
      'isize',
    ]
    return primitives.includes(this.name)
  }
}

class ArrayType {
  public name: string

  constructor(public inner: string) {
    this.inner = inner
    this.name = `Array<${inner.toString()}>`
  }

  toString() {
    return this.name
  }
}

class NullableType {
  constructor(public inner: NamedType | ArrayType) {
    this.inner = inner
  }

  toString() {
    return `${this.inner.toString()} | null`
  }
}

class ModuleImports {
  constructor(public nameOrNames: string | string[], public module: string) {
    this.nameOrNames = nameOrNames
    this.module = module
  }

  toString() {
    return `import { ${
      typeof this.nameOrNames === 'string' ? this.nameOrNames : this.nameOrNames.join(',')
    } } from "${this.module}"`
  }
}

const namedType = (name: string) => new NamedType(name)
const arrayType = (name: string) => new ArrayType(name)
const param = (name: string, type: NamedType) => new Param(name, type)
const method = (
  name: string,
  params: Param[],
  returnType: NamedType | undefined,
  body: string,
) => new Method(name, params, returnType, body)
const staticMethod = (
  name: string,
  params: Param[],
  returnType: NamedType | NullableType,
  body: string,
) => new StaticMethod(name, params, returnType, body)
const klass = (name: string, options: ClassOptions) => new Class(name, options)
const klassMember = (name: string, type: string) => new ClassMember(name, type)
const nullableType = (type: NamedType | ArrayType) => new NullableType(type)
const moduleImports = (nameOrNames: string | string[], module: string) =>
  new ModuleImports(nameOrNames, module)

const GENERATED_FILE_NOTE = `
// THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY.
`

export {
  // Types
  Param,
  Method,
  StaticMethod,
  Class,
  ClassMember,
  NamedType,
  NullableType,
  ArrayType,
  ModuleImports,
  // Code generators
  namedType,
  arrayType,
  klass,
  klassMember,
  method,
  staticMethod,
  param,
  nullableType,
  moduleImports,
  // Utilities
  GENERATED_FILE_NOTE,
}
