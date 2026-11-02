import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export async function createTempWorkspace(prefix: string): Promise<{
  directory: string
  cleanup: () => Promise<void>
}> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  return {
    directory,
    cleanup: async () => {
      await rm(directory, { recursive: true, force: true })
    }
  }
}
