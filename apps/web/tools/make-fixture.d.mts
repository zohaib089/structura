export function buildFixture(targetNodes: number): {
  schemaVersion: string
  summary: { nodes: number; edges: number; files: number }
  coverage: unknown
  nodes: unknown[]
  edges: unknown[]
}
