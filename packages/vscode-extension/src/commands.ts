export const COMMANDS = {
  showFileGraph: 'atlasmith.showFileGraph',
  showProjectGraph: 'atlasmith.showProjectGraph'
} as const

export type CommandId = (typeof COMMANDS)[keyof typeof COMMANDS]

export type GraphCommandMode = 'file' | 'project'
