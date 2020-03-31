import path from 'path'
import { promises as fs, Dirent } from 'fs'
import { promisify } from 'util'
import { BuilderOptions } from '@pika/types'
import ncp from 'ncp'

const copy = promisify(ncp)

async function getAllFiles(dir : string, sub : string = '') : Promise<string[]> {
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
    dirents.map(async (dirent) => {
      const res = dirent.name
      return dirent.isDirectory()
        ? [...(await getAllFiles(path.resolve(dir, res || ''), `${sub + res}/`)), sub + res]
        : ([sub + res])
    }),
  )
  return Array.prototype.concat(...files)
}

// eslint-disable-next-line import/prefer-default-export
export async function build({
  out, options,
}: BuilderOptions): Promise<void> {
  const distFolder = options.dist || 'dist'

  const distPath = path.resolve(out || '', '..', distFolder)
  const dirs = []
  try {
    dirs.push(...(await fs.readdir(distPath)))
  } catch (err) {
    //
  }

  // Clean dist folder
  await Promise.all(dirs.map(async (dir) => {
    const stat = await fs.lstat(path.resolve(distPath, dir))

    if (stat.isDirectory()) {
      const files = await getAllFiles(path.resolve(distPath, dir))
      await Promise.all(files.map(async (file) => {
        const filePath = path.resolve(distPath, dir || '', file || '')

        if (!['index.js', 'index.ts', 'index.d.ts'].includes(file)) {
          const fstat = await fs.lstat(filePath)

          if (fstat.isDirectory()) {
            await fs.rmdir(filePath, {
              recursive: true,
            })
          } else {
            await fs.unlink(filePath)
          }
        }
      }))
    }
  }))
}

export function afterBuild({ reporter, out, options }: BuilderOptions): void {
  setTimeout(async () => {
    const distFolder = options.dist || 'dist'
    const distPath = path.resolve(out || '', '..', distFolder)
    reporter.info(`moving output to folder ${distFolder}`)

    // Copy out to dist
    await copy(out, distPath)

    // Delete out
    fs.rmdir(out, {
      recursive: true,
    })
  }, 100)
}
