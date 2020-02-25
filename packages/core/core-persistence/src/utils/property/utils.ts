import Voca from 'voca'

// Check if value is an array. If it is a single element, wrap it in an array
export function wrap<T>(arrayLike ?: T|T[]) : T[] {
  if (!arrayLike) {
    return []
  }

  return Array.isArray(arrayLike) ? arrayLike : [arrayLike]
}

// Turn any given name into a properly cased model name
export function extractModelType(name: string, capitalize: boolean = true): string {
  const camelCased = Voca.camelCase(name)
  return capitalize ? Voca.capitalize(camelCased) : camelCased
}
