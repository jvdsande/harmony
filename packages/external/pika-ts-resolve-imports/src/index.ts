import path from 'path'
import { promises as fs, Dirent } from 'fs'
import { BuilderOptions } from '@pika/types'

const ESM_IMPORT = /(im|ex)port(?:["'\s]*([\w*${}\n\r\t, ]+)from\s*)?["'\s]["'\s](@?([\w-]+[:/]?[\w-]+)+)["'\s].*;$/gm

async function getAllFiles(dir : string) : Promise<string[]> {
  let dirents : Dirent[]
  try {
    dirents = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if (err.code === 'ENOENT') {
      return []
    }
    throw err
  }
  const files = await Promise.all(
    dirents.map((dirent) => {
      const res = path.resolve(dir, dirent.name)
      return dirent.isDirectory() ? getAllFiles(res) : Promise.resolve([res])
    }),
  )
  return Array.prototype.concat(...files)
}

type TSConfig = {
  compilerOptions?: {
    baseUrl?: string,
    paths?: Record<string, string[]>
  }
}

// eslint-disable-next-line import/prefer-default-export
export async function build({
  out, reporter, cwd, src: { files },
}: BuilderOptions): Promise<void> {
  const tsConfigJson = await fs.readFile(path.join(cwd, 'tsconfig.json'), 'utf-8')

  if (!tsConfigJson) {
    reporter.warning('tsconfig.json was not found, skipping')
    return
  }

  const tsConfig : TSConfig = JSON.parse(tsConfigJson)

  const { baseUrl, paths } = tsConfig.compilerOptions || {}

  if (!baseUrl) {
    reporter.warning('baseUrl is not defined, skipping')
    return
  }

  if (paths) {
    reporter.warning('Note: paths property is not yet supported, only baseUrl will get matched')
  }

  const srcDir = path.join(out, 'dist-src/')
  const typesDir = path.join(out, 'dist-types/')

  const [allSrcFilePaths, allTypesFilePaths] = await Promise.all([
    getAllFiles(srcDir),
    getAllFiles(typesDir),
  ])

  let count = 0
  const resolveImports = (dirPath: string) => async (filePath: string) => {
    const fileContents = await fs.readFile(filePath, { encoding: 'utf8' })
    const newFileContents = fileContents.replace(ESM_IMPORT, (full, type, imp, spec) => {
      // Get path from baseUrl
      const resolvedPath = path.resolve(cwd, baseUrl, spec)
      const resolvedInSource = !!files.find((f) => f.startsWith(resolvedPath))
      const resolvedSpec = `${path.relative(path.resolve(cwd, baseUrl), resolvedPath)}`
      const fileDirPath = filePath.replace(/[^/]*?$/, '')
      const filePathDepth = path.relative(fileDirPath, dirPath) || '.'

      /*
      reporter.info(JSON.stringify({
        full,
        resolvedPath,
        resolvedInSource,
        resolvedSpec,
        fileDirPath,
        filePathDepth,
      }, null, 2))
       */

      if (!resolvedInSource) {
        return full
      }

      count += 1

      return `${type}port ${imp}from '${filePathDepth}/${resolvedSpec}'`
    })

    await fs.writeFile(filePath, newFileContents, { encoding: 'utf8' })
  }

  reporter.info('Resolving paths for dist-src/')

  count = 0
  await Promise.all(allSrcFilePaths.map(resolveImports(srcDir)))

  if (count) {
    reporter.info(`Resolved ${count} imports/exports in ${path.relative(cwd, srcDir)}`)
  }

  reporter.info('Resolving paths for dist-types/')

  count = 0
  await Promise.all(allTypesFilePaths.map(resolveImports(typesDir)))

  if (count) {
    reporter.info(`Resolved ${count} imports/exports in ${path.relative(cwd, srcDir)}`)
  }

  reporter.info('Imports resolved')
}
