import type * as vscode from 'vscode'
import { COMMANDS } from './commands.js'
import { copy } from './messages.js'

export const GRAPH_VIEW_ID = 'atlasmith.graphView'

export interface GraphViewItem {
  id: 'file' | 'project'
  label: string
  command: string
}

export function graphViewItems(): GraphViewItem[] {
  return [
    { id: 'file', label: copy('showFileGraphItem'), command: COMMANDS.showFileGraph },
    { id: 'project', label: copy('showProjectGraphItem'), command: COMMANDS.showProjectGraph }
  ]
}

export class AtlasmithGraphViewProvider implements vscode.TreeDataProvider<GraphViewItem> {
  constructor(
    private readonly vs: typeof vscode,
    readonly items: GraphViewItem[] = graphViewItems()
  ) {}

  getTreeItem(element: GraphViewItem): vscode.TreeItem {
    const item = new this.vs.TreeItem(element.label, this.vs.TreeItemCollapsibleState.None)
    item.id = element.id
    item.tooltip = element.label
    item.command = { command: element.command, title: element.label }
    item.contextValue = `atlasmith.${element.id}`
    item.iconPath = new this.vs.ThemeIcon('type-hierarchy')
    return item
  }

  getChildren(element?: GraphViewItem): GraphViewItem[] {
    if (element) return []
    return this.items
  }
}

export function registerGraphView(vs: typeof vscode): vscode.Disposable {
  const provider = new AtlasmithGraphViewProvider(vs)
  return vs.window.registerTreeDataProvider(GRAPH_VIEW_ID, provider)
}
