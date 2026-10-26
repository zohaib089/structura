import { GRAPH_BYTE_LIMIT } from './caps'
import type { ReadResult } from './graph-types'
import { readGraph } from './read-graph'

export async function handleGraphFile(file: Blob): Promise<ReadResult> {
  if (file.size > GRAPH_BYTE_LIMIT) {
    return { ok: false, error: { code: 'too-large', limitBytes: GRAPH_BYTE_LIMIT, actualBytes: file.size } }
  }
  const text = await file.text()
  return readGraph(text)
}
