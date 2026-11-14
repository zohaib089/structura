import * as vscode from 'vscode'
import { workspaceConsentStore } from './consent.js'
import { GraphSession, registerCommands } from './graph-session.js'
import { registerGraphView } from './graph-view.js'
import { engineScanner } from './workspace-scan.js'

export function activate(context: vscode.ExtensionContext): void {
  const session = new GraphSession({
    vscode,
    context,
    consent: workspaceConsentStore(context),
    scanner: engineScanner
  })
  context.subscriptions.push(session, registerGraphView(vscode), ...registerCommands(session, vscode))
}

export function deactivate(): void {}
