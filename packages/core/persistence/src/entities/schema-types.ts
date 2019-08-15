import { SchemaType } from '@harmonyjs/types-persistence'

class TypesClass {
  get String() {
    return new SchemaType('string')
  }

  get Number() {
    return new SchemaType('number')
  }

  get Float() {
    return new SchemaType('float')
  }

  get Boolean() {
    return new SchemaType('boolean')
  }

  get JSON() {
    return new SchemaType('json')
  }

  get Date() {
    return new SchemaType('date')
  }

  get Map() {
    return new SchemaType(
      'map',
      (type) => new SchemaType('map', type),
    )
  }

  get Array() {
    return new SchemaType(
      'array',
      (type) => new SchemaType('array', type),
    )
  }

  get ID() {
    return new SchemaType('id')
  }

  get Reference() {
    return new SchemaType('reference', (type) => new SchemaType('reference', type))
  }
}

const Types = new TypesClass()
export default Types
