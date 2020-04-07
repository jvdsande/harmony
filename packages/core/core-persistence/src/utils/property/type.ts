import {
  IProperty, IPropertyUndiscriminated,
  PropertyMode, PropertyType,
} from '@harmonyjs/types-persistence'

export type PropertyConfiguration = IPropertyUndiscriminated['__configuration']

export type PropertyFactoryCommonArgs = {
  name: string
  mode?: PropertyMode|PropertyMode[]
  parent?: IProperty
}

export type PropertyFactoryPrimitive<T extends PropertyType> = PropertyFactoryCommonArgs & ({
  type: T, of?: never, on?: never
})
export type PropertyFactoryString = PropertyFactoryPrimitive<'string'>
export type PropertyFactoryNumber = PropertyFactoryPrimitive<'number'>
export type PropertyFactoryFloat = PropertyFactoryPrimitive<'float'>
export type PropertyFactoryBoolean = PropertyFactoryPrimitive<'boolean'>
export type PropertyFactoryID = PropertyFactoryPrimitive<'id'>
export type PropertyFactoryJSON = PropertyFactoryPrimitive<'json'>
export type PropertyFactoryDate = PropertyFactoryPrimitive<'date'>

export type PropertyFactoryScalar = PropertyFactoryCommonArgs & ({
  type: 'scalar'
  of: string
  on?: never
})

export type PropertyFactoryRaw = PropertyFactoryCommonArgs & ({
  type: 'raw'
  of: string
  on?: never
})

export type PropertyFactoryReference = PropertyFactoryCommonArgs & ({
  type: 'reference'
  of: string
  on?: never
})

export type PropertyFactoryReversedReference = PropertyFactoryCommonArgs & ({
  type: 'reversed-reference'
  of: string
  on: string
})

export type PropertyFactorySchema = PropertyFactoryCommonArgs & ({
  type: 'schema'
  of: {[key: string]: IProperty}
  on?: never
})

export type PropertyFactoryArray = PropertyFactoryCommonArgs & ({
  type: 'array'
  of: IProperty
  on?: never
})

export type PropertyFactoryUndiscriminated = PropertyFactoryCommonArgs & ({
  type: PropertyType
  of?: string|IProperty|{[key: string]: IProperty}
  on?: string
})

export type PropertyFactoryArgs = PropertyFactoryRaw|
  PropertyFactoryString|PropertyFactoryNumber|PropertyFactoryFloat|PropertyFactoryBoolean|
  PropertyFactoryID|PropertyFactoryJSON|PropertyFactoryDate|PropertyFactoryReference|
  PropertyFactoryReversedReference|PropertyFactorySchema|PropertyFactoryArray|
  PropertyFactoryUndiscriminated
