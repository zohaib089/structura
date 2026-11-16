/** Vue Flow node id of the ring-guides layer (decoration drawn under the radial graph). */
export const GUIDES_NODE_ID = '__radial-guides__'

/** The ring-guides layer is decoration, never a selection: a click there must reach the file under it. */
export function isSelectableNodeId(id: string): boolean {
  return id !== GUIDES_NODE_ID
}
