import {
  IProperty,
  IPropertyArray,
  IPropertyBoolean, IPropertyDate, IPropertyFloat, IPropertyID, IPropertyJSON, IPropertyNumber, IPropertyRaw,
  IPropertyReference, IPropertyReversedReference, IPropertyScalar, IPropertySchema,
  IPropertyString, IPropertyUndiscriminated, PropertyMode, Schema,
} from '@harmonyjs/types-persistence'

import {
  computeGraphQLAnnotations,
  computeGraphQLArgs, computeGraphQLArgsSchema,
  computeGraphQLInputSchema,
  computeGraphQLInputType, computeGraphQLName, computeGraphQLSchema, computeGraphQLType,
} from 'utils/property/graphql'
import { sanitizeSchema } from 'utils/property/sanitation'
import {
  PropertyConfiguration,
  PropertyFactoryArgs,
  PropertyFactoryArray,
  PropertyFactoryBoolean, PropertyFactoryDate,
  PropertyFactoryFloat, PropertyFactoryID, PropertyFactoryJSON, PropertyFactoryNumber, PropertyFactoryRaw,
  PropertyFactoryReference, PropertyFactoryReversedReference, PropertyFactoryScalar, PropertyFactorySchema,
  PropertyFactoryString, PropertyFactoryUndiscriminated,
} from 'utils/property/type'
import { wrap } from 'utils/property/utils'


/**
 * Create a Property completely sanitized, with type autodetected from the `type` argument
 */
function PropertyFactory(args: PropertyFactoryScalar): IPropertyScalar
function PropertyFactory(args: PropertyFactoryRaw): IPropertyRaw
function PropertyFactory(args: PropertyFactoryString): IPropertyString
function PropertyFactory(args: PropertyFactoryNumber): IPropertyNumber
function PropertyFactory(args: PropertyFactoryFloat): IPropertyFloat
function PropertyFactory(args: PropertyFactoryBoolean): IPropertyBoolean
function PropertyFactory(args: PropertyFactoryID): IPropertyID
function PropertyFactory(args: PropertyFactoryJSON): IPropertyJSON
function PropertyFactory(args: PropertyFactoryDate): IPropertyDate
function PropertyFactory<T extends Schema>(args: PropertyFactoryReference)
  : IPropertyReference<T>
function PropertyFactory<T extends Schema>(args: PropertyFactoryReversedReference)
  : IPropertyReversedReference<T>
function PropertyFactory(args: PropertyFactorySchema): IPropertySchema
function PropertyFactory(args: PropertyFactoryArray): IPropertyArray
function PropertyFactory(args: PropertyFactoryUndiscriminated): IProperty
function PropertyFactory({
  type,
  name,
  mode,
  parent,
  of,
  on,
} : PropertyFactoryArgs) : IProperty {
  // Pre-fill the internal configuration of the property
  const configuration : PropertyConfiguration = {
    indexed: false,
    unique: false,
    required: false,
    args: undefined,
    isFor: '',
    mode: wrap(mode),

    // federation
    primary: false,
    external: false,
    provides: [],
    requires: [],
  }

  const instance : IPropertyUndiscriminated = {
    __configuration: configuration,

    type,
    name,
    parent,
    of: of!,
    on: on!,

    clone() {
      const clone : IPropertyUndiscriminated = PropertyFactory({
        type: instance.type,
        name: instance.name,
        of: instance.of,
        on: instance.on,
      }) as IPropertyUndiscriminated

      clone.__configuration.indexed = configuration.indexed
      clone.__configuration.unique = configuration.unique
      clone.__configuration.required = configuration.required
      clone.__configuration.isFor = configuration.isFor
      clone.__configuration.mode = [...configuration.mode]
      // federation
      clone.__configuration.primary = configuration.primary
      clone.__configuration.external = configuration.external
      clone.__configuration.provides = [...configuration.provides]
      clone.__configuration.requires = [...configuration.requires]

      if (configuration.args) {
        clone.__configuration.args = sanitizeSchema({
          schema: configuration.args,
          name: 'args',
        })
        clone.__configuration.args.parent = clone as IProperty
      }

      if (clone.type === 'schema') {
        const ofSchema = (clone.of as {[key: string]: IProperty})
        Object.keys(ofSchema).forEach((field) => {
          ofSchema[field] = ofSchema[field].clone()
          ofSchema[field].parent = clone as IProperty
        })
      }

      if (clone.type === 'array') {
        const ofProp = (clone.of as IProperty).clone()
        ofProp.parent = clone as IProperty
        clone.of = ofProp
      }

      return clone
    },

    // Modifiers
    get indexed() {
      configuration.indexed = true
      return instance
    },
    get unique() {
      configuration.unique = true
      return instance
    },
    get required() {
      configuration.required = true
      return instance
    },
    withArgs(args: Schema) {
      configuration.args = sanitizeSchema({ schema: args, name: 'args' })
      configuration.args.parent = instance as IProperty
      return instance
    },
    withMode(m: PropertyMode|PropertyMode[]) {
      configuration.mode = wrap(m)
      return instance
    },
    as<O, I = O>() {
      return instance as IProperty
    },
    for(adapter: string) {
      configuration.isFor = adapter
      return instance
    },

    // Accessors
    get mode() {
      return configuration.mode
    },
    get isIndexed() {
      return configuration.indexed
    },
    get isUnique() {
      return configuration.unique
    },
    get isRequired() {
      return configuration.required
    },
    get isFor() {
      return configuration.isFor
    },

    // Federation specific modifiers
    get primary() {
      configuration.primary = true
      return instance
    },
    get external() {
      configuration.external = true
      return instance
    },
    provides(...fields: string[]) {
      configuration.provides = fields
      return instance
    },
    requires(...fields: string[]) {
      configuration.requires = fields
      return instance
    },

    // Federation specific accessors
    get isPrimary() {
      return configuration.primary
    },
    get isExternal() {
      return configuration.external
    },
    get doesProvide() {
      return configuration.provides.join(',')
    },
    get doesRequire() {
      return configuration.requires.join(',')
    },

    // GraphQL helpers
    get graphqlName() {
      return computeGraphQLName({ name: instance.name, parent: instance.parent })
    },
    get graphqlAnnotations() {
      return computeGraphQLAnnotations({ configuration })
    },
    get graphqlType() {
      return computeGraphQLType({
        type: instance.type,
        configuration,
        name: instance.graphqlName,
        of: instance.of,
        isFor: instance.isFor,
      })
    },
    get graphqlInputType() {
      return computeGraphQLInputType({
        type: instance.type,
        configuration,
        name: instance.graphqlName,
        of: instance.of,
        isFor: instance.isFor,
      })
    },
    get graphqlSchema() {
      if (instance.type === 'schema') {
        return computeGraphQLSchema({ name: instance.graphqlName, schema: (instance as IPropertySchema).of })
      }

      if (instance.type === 'array') {
        return instance.deepOf.graphqlSchema
      }

      return ''
    },
    get graphqlInputSchema() {
      if (instance.type === 'schema') {
        return computeGraphQLInputSchema({ name: instance.graphqlName, schema: (instance as IPropertySchema).of })
      }

      if (instance.type === 'array') {
        return instance.deepOf.graphqlInputSchema
      }

      return ''
    },
    get graphqlArgsSchema() {
      return configuration.args
        ? computeGraphQLArgsSchema({ schema: configuration.args.of })
        : ''
    },
    get graphqlArgs() {
      return configuration.args
        ? computeGraphQLArgs({ args: configuration.args })
        : ''
    },

    // Get the first non-array property in the dependency graph of an array
    get deepOf() {
      if (instance.type === 'array') {
        return (instance.of as IPropertyArray).deepOf
      }

      return instance as IProperty
    },
  }

  return instance as IProperty
}

export default PropertyFactory
