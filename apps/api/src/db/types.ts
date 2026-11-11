export interface WorkspaceQueryResult {
  rows: Array<Record<string, unknown>>
  rowCount?: number | null
}

export type WorkspaceQuery = (
  text: string,
  params?: unknown[]
) => Promise<WorkspaceQueryResult>

export type WorkspaceTransaction = <T>(
  operation: (query: WorkspaceQuery) => Promise<T>
) => Promise<T>

export interface WorkspaceDatabase {
  query: WorkspaceQuery
  transaction: WorkspaceTransaction
}
