import type { Node } from 'web-tree-sitter'
import { looksSecret, REDACTED } from '../../redact.js'
import type { Span, SymbolKind } from '../../graph/types.js'
import type { AdapterParseResult, ExtractedReference, ExtractedSymbol, ExtractLimits } from '../adapter.js'
import { LineIndex, TOO_LONG } from '../ts-js/extract.js'

interface State {
  lines: LineIndex
  limits: ExtractLimits
  references: ExtractedReference[]
  symbols: ExtractedSymbol[]
  omitted: { longNames: number; symbols: number; edges: number }
  redactions: number
}

const nodeSpan = (state: State, node: Node): Span => state.lines.span(node.startIndex, node.endIndex)

function literalValue(node: Node | null): string | undefined {
  if (!node) return undefined
  if (node.type === 'string') {
    let value = ''
    for (const child of node.children) {
      if (child.type === 'string_content') value += child.text
      else if (child.type === 'escape_sequence') return undefined
    }
    return value
  }
  return undefined
}

function addReference(
  state: State,
  node: Node,
  importKind: ExtractedReference['importKind'],
  typeOnly: boolean,
  literal: string | undefined,
  names?: string[]
): void {
  if (state.references.length >= state.limits.maxEdgesPerFile) {
    state.omitted.edges += 1
    return
  }
  let specifier: string | null = literal ?? null
  let redacted = false
  if (specifier !== null) {
    if (specifier.length > state.limits.maxIdentifierLength) {
      specifier = TOO_LONG
      state.omitted.longNames += 1
    } else if (looksSecret(specifier)) {
      specifier = REDACTED
      redacted = true
      state.redactions += 1
    }
  }
  state.references.push({
    edgeType: 'imports',
    importKind,
    typeOnly,
    specifier,
    redacted,
    span: nodeSpan(state, node),
    ...(names && names.length > 0 ? { names } : {})
  })
}

function underTypeChecking(node: Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'if_statement') {
      const condition = current.childForFieldName('condition') ?? current.namedChildren.find(child => child.type === 'identifier')
      return condition?.type === 'identifier' && condition.text === 'TYPE_CHECKING'
    }
    if (current.type === 'module') return false
  }
  return false
}

function dottedNameText(node: Node): string {
  return node.descendantsOfType('identifier').map(part => part.text).join('.')
}

function relativeImportSpecifier(node: Node): string | undefined {
  const relative = node.children.find(child => child.type === 'relative_import')
  if (!relative) return undefined
  const prefix = relative.children.find(child => child.type === 'import_prefix')?.text ?? ''
  const tail = relative.children.find(child => child.type === 'dotted_name')
  const rest = tail ? dottedNameText(tail) : ''
  return rest === '' ? prefix : `${prefix}${rest}`
}

function importNamesFromFrom(node: Node): string[] {
  const names: string[] = []
  let afterImport = false
  for (const child of node.children) {
    if (child.type === 'import' && !child.isNamed) {
      afterImport = true
      continue
    }
    if (!afterImport) continue
    if (child.type === 'dotted_name') {
      const ident = child.namedChildren.find(part => part.type === 'identifier')
      if (ident) names.push(ident.text)
    } else if (child.type === 'aliased_import') {
      const bound = child.childForFieldName('name') ?? child.namedChildren.find(part => part.type === 'identifier')
      if (bound) names.push(bound.text)
    }
  }
  return names
}

function handleImportStatement(state: State, node: Node): void {
  let typeOnly = underTypeChecking(node)
  for (const child of node.namedChildren) {
    if (child.type === 'dotted_name') {
      const spec = dottedNameText(child)
      if (spec === '_typeshed' || spec.startsWith('_typeshed.')) typeOnly = true
      addReference(state, node, 'static', typeOnly, spec)
    } else if (child.type === 'aliased_import') {
      const module = child.children.find(part => part.type === 'dotted_name')
      if (module) {
        const spec = dottedNameText(module)
        if (spec === '_typeshed' || spec.startsWith('_typeshed.')) typeOnly = true
        addReference(state, node, 'static', typeOnly, spec)
      }
    }
  }
}

function handleImportFrom(state: State, node: Node): void {
  let typeOnly = underTypeChecking(node)
  const relative = relativeImportSpecifier(node)
  const names = importNamesFromFrom(node)
  if (relative !== undefined) {
    addReference(state, node, 'static', typeOnly, relative, names)
    return
  }
  const module = node.children.find(child => child.type === 'dotted_name')
  if (module) {
    const spec = dottedNameText(module)
    if (spec === '_typeshed' || spec.startsWith('_typeshed.')) typeOnly = true
    addReference(state, node, 'static', typeOnly, spec, names)
  }
}

function firstCallArgument(node: Node): Node | null {
  const args = node.childForFieldName('arguments') ?? node.namedChildren.find(child => child.type === 'argument_list')
  if (!args) return null
  return args.namedChildren.find(child => child.type !== 'comment') ?? null
}

function handleCall(state: State, node: Node): void {
  const callee = node.childForFieldName('function') ?? node.namedChildren[0]
  if (!callee) return
  let dynamic = false
  if (callee.type === 'identifier' && callee.text === '__import__') dynamic = true
  else if (callee.type === 'attribute' && callee.text.endsWith('.import_module')) dynamic = true
  else return
  addReference(state, node, 'dynamic', underTypeChecking(node), literalValue(firstCallArgument(node)))
}

function addSymbol(state: State, qualifiedName: string, label: string, symbolKind: SymbolKind, exported: boolean, node: Node): void {
  if (label.length === 0) return
  if (qualifiedName.length > state.limits.maxIdentifierLength) {
    state.omitted.longNames += 1
    return
  }
  if (state.symbols.length >= state.limits.maxSymbolsPerFile) {
    state.omitted.symbols += 1
    return
  }
  state.symbols.push({ qualifiedName, label, symbolKind, exported, span: nodeSpan(state, node) })
}

function definitionName(node: Node): string | undefined {
  return node.childForFieldName('name')?.text ?? node.namedChildren.find(child => child.type === 'identifier')?.text
}

function collectSymbols(state: State, root: Node): void {
  const stack: Array<{ node: Node; prefix: string }> = [{ node: root, prefix: '' }]
  while (stack.length > 0) {
    const { node, prefix } = stack.pop() as { node: Node; prefix: string }
    const qualify = (name: string): string => (prefix === '' ? name : `${prefix}.${name}`)

    if (node.type === 'class_definition') {
      const name = definitionName(node)
      if (name) {
        addSymbol(state, qualify(name), name, 'class', true, node)
        const body = node.childForFieldName('body')
        if (body) {
          for (let index = body.namedChildren.length - 1; index >= 0; index -= 1) {
            stack.push({ node: body.namedChildren[index] as Node, prefix: qualify(name) })
          }
        }
      }
      continue
    }
    if (node.type === 'function_definition') {
      const name = definitionName(node)
      if (name) addSymbol(state, qualify(name), name, 'function', prefix === '', node)
      continue
    }
    if (node.type === 'decorated_definition') {
      const inner = node.namedChildren.find(child => child.type === 'class_definition' || child.type === 'function_definition')
      if (inner) stack.push({ node: inner, prefix })
      continue
    }
    if (node.type === 'module' || node.type === 'block') {
      for (let index = node.namedChildren.length - 1; index >= 0; index -= 1) stack.push({ node: node.namedChildren[index] as Node, prefix })
    }
  }
}

function collectSyntaxErrors(root: Node, lines: LineIndex): { span: Span }[] {
  if (!root.hasError) return []
  const issues: { span: Span }[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    if (node.isMissing || node.type === 'ERROR') {
      issues.push({ span: lines.span(node.startIndex, node.endIndex) })
      continue
    }
    if (!node.hasError) continue
    for (let index = node.children.length - 1; index >= 0; index -= 1) stack.push(node.children[index] as Node)
  }
  issues.sort(byPosition)
  return issues
}

const byPosition = (a: { span: Span }, b: { span: Span }): number =>
  a.span.start.line - b.span.start.line || a.span.start.col - b.span.start.col

/** Walks a tree-sitter Python tree and extracts module facts. */
export function extractPythonModuleFacts(root: Node, content: string, limits: ExtractLimits): AdapterParseResult {
  const state: State = { lines: new LineIndex(content), limits, references: [], symbols: [], omitted: { longNames: 0, symbols: 0, edges: 0 }, redactions: 0 }

  for (const node of root.descendantsOfType(['import_statement', 'import_from_statement', 'call'])) {
    if (node.type === 'import_statement') handleImportStatement(state, node)
    else if (node.type === 'import_from_statement') handleImportFrom(state, node)
    else handleCall(state, node)
  }
  collectSymbols(state, root)

  state.references.sort(byPosition)
  state.symbols.sort((a, b) => byPosition(a, b) || (a.qualifiedName < b.qualifiedName ? -1 : a.qualifiedName > b.qualifiedName ? 1 : 0))
  const syntaxErrors = collectSyntaxErrors(root, state.lines)
  return {
    references: state.references,
    symbols: state.symbols,
    syntaxErrorCount: syntaxErrors.length,
    syntaxErrors,
    omitted: state.omitted,
    redactions: state.redactions
  }
}
