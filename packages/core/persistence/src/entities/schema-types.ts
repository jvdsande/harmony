import { Property, SanitizedPropertySchema, Model } from '@harmonyjs/types-persistence'

class TypesClass {
  get String() {
    return new Property({ type: 'string' })
  }

  get Number() {
    return new Property({ type: 'number' })
  }

  get Float() {
    return new Property({ type: 'float' })
  }

  get Boolean() {
    return new Property({ type: 'boolean' })
  }

  get JSON() {
    return new Property({ type: 'json' })
  }

  get Date() {
    return new Property({ type: 'date' })
  }

  get Map() {
    return ({
      of: (type : Property) => new Property({ type: 'map', of: type }),
    })
  }

  get Array() {
    return ({
      of: (type : Property | 'inherit') => new Property({ type: 'array', of: type }),
    })
  }

  get ID() {
    return new Property({ type: 'id' })
  }

  get Reference() {
    return ({
      of: (type : Model | string) => new Property(({
        type: 'reference',
        of: typeof type === 'string' ? type : type.name,
      })),
    })
  }

  get Schema() {
    return ({
      of: (type : SanitizedPropertySchema) => new Property(({ type: 'nested', of: type })),
    })
  }
}

const Types = new TypesClass()
export default Types
