import type { Node } from 'web-tree-sitter'
import { looksSecret, REDACTED } from '../../redact.js'
import type { Span, SymbolKind } from '../../graph/types.js'
import type { AdapterParseResult, ExtractedBinding, ExtractedCall, ExtractedReference, ExtractedSymbol, ExtractLimits } from '../adapter.js'
import { sanitizeDocSummary } from '../doc-summary.js'
import { LineIndex, TOO_LONG } from '../ts-js/extract.js'

interface State {
  lines: LineIndex
  limits: ExtractLimits
  content: string
  references: ExtractedReference[]
  symbols: ExtractedSymbol[]
  calls: ExtractedCall[]
  unresolvedCalls: number
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
  names?: string[],
  bindings?: ExtractedBinding[]
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
    ...(names && names.length > 0 ? { names } : {}),
    ...(bindings && bindings.length > 0 ? { bindings } : {})
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
      if (bound) names.push(bound.type === 'dotted_name' ? dottedNameText(bound) : bound.text)
    }
  }
  return names
}

function importBindingsFromFrom(node: Node): ExtractedBinding[] | undefined {
  const bindings: ExtractedBinding[] = []
  let afterImport = false
  for (const child of node.children) {
    if (child.type === 'import' && !child.isNamed) {
      afterImport = true
      continue
    }
    if (!afterImport) continue
    if (child.type === 'dotted_name') {
      const ident = child.namedChildren.find(part => part.type === 'identifier')
      if (ident) bindings.push({ local: ident.text, imported: ident.text })
    } else if (child.type === 'aliased_import') {
      const importedNode = child.childForFieldName('name') ?? child.namedChildren.find(part => part.type === 'dotted_name' || part.type === 'identifier')
      const aliasNode = child.childForFieldName('alias')
      const imported = importedNode
        ? (importedNode.type === 'dotted_name' ? dottedNameText(importedNode) : importedNode.text)
        : undefined
      const local = aliasNode?.text ?? imported
      if (imported && local) bindings.push({ local, imported })
    }
  }
  return bindings.length > 0 ? bindings : undefined
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
        const alias = child.childForFieldName('alias')
        addReference(state, node, 'static', typeOnly, spec, undefined, alias ? [{ local: alias.text, imported: '*' }] : undefined)
      }
    }
  }
}

function handleImportFrom(state: State, node: Node): void {
  let typeOnly = underTypeChecking(node)
  const relative = relativeImportSpecifier(node)
  const names = importNamesFromFrom(node)
  const bindings = importBindingsFromFrom(node)
  if (relative !== undefined) {
    addReference(state, node, 'static', typeOnly, relative, names, bindings)
    return
  }
  const module = node.children.find(child => child.type === 'dotted_name')
  if (module) {
    const spec = dottedNameText(module)
    if (spec === '_typeshed' || spec.startsWith('_typeshed.')) typeOnly = true
    addReference(state, node, 'static', typeOnly, spec, names, bindings)
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

function addSymbol(state: State, qualifiedName: string, label: string, symbolKind: SymbolKind, exported: boolean, node: Node, extras: Partial<ExtractedSymbol> = {}): void {
  if (label.length === 0) return
  if (qualifiedName.length > state.limits.maxIdentifierLength) {
    state.omitted.longNames += 1
    return
  }
  if (state.symbols.length >= state.limits.maxSymbolsPerFile) {
    state.omitted.symbols += 1
    return
  }
  const parent = extras.parent ?? (qualifiedName.includes('.') ? qualifiedName.slice(0, qualifiedName.lastIndexOf('.')) : undefined)
  const allowDoc = symbolKind === 'function' || symbolKind === 'class'
  const docSummary = allowDoc ? (extras.docSummary ?? pythonDocstring(node)) : extras.docSummary
  state.symbols.push({
    qualifiedName,
    label,
    symbolKind,
    exported,
    span: nodeSpan(state, node),
    ...(parent ? { parent } : {}),
    ...(extras.paramCount !== undefined ? { paramCount: extras.paramCount } : {}),
    ...(extras.scope ? { scope: extras.scope } : {}),
    ...(extras.mutable !== undefined ? { mutable: extras.mutable } : {}),
    ...(extras.stateKind ? { stateKind: extras.stateKind } : {}),
    ...(docSummary ? { docSummary } : {})
  })
}

function pythonDocstring(node: Node): string | undefined {
  const body = node.childForFieldName('body')
  if (!body) return undefined
  const first = body.namedChildren.find(child => child.type !== 'comment')
  if (!first) return undefined
  const expr = first.type === 'expression_statement' ? first.namedChildren[0] : first
  if (!expr || expr.type !== 'string') return undefined
  return sanitizeDocSummary(stripPythonString(expr.text))
}

function stripPythonString(raw: string): string {
  const prefix = /^[fFrRbBuU]*/.exec(raw)?.[0] ?? ''
  let text = raw.slice(prefix.length)
  if ((text.startsWith('"""') && text.endsWith('"""')) || (text.startsWith(") && text.endsWith("))) {
    text = text.slice(3, text.length - 3)
  } else if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, text.length - 1)
  }
  return text.replace(/^\n/, '')
}

function isConstantName(name: string): boolean {
  return /^[A-Z][A-Z0-9_]+$/.test(name)
}

function formalParamCount(node: Node): number {
  const params = node.childForFieldName('parameters') ?? node.namedChildren.find(child => child.type === 'parameters')
  if (!params) return 0
  return params.namedChildren.filter(child => child.type !== 'comment').length
}

function firstParamName(node: Node): string | undefined {
  const params = node.childForFieldName('parameters') ?? node.namedChildren.find(child => child.type === 'parameters')
  const first = params?.namedChildren.find(child => child.type !== 'comment')
  if (!first) return undefined
  if (first.type === 'identifier') return first.text
  return first.childForFieldName('name')?.text ?? first.namedChildren.find(child => child.type === 'identifier')?.text
}

function identifierOfTarget(node: Node): string | undefined {
  if (node.type === 'identifier') return node.text
  if (node.type === 'pattern_list' || node.type === 'expression_list') {
    // only simple single-name targets are recorded as one symbol; unpack is skipped
    return undefined
  }
  return undefined
}

function attributeParts(node: Node): { object: string; name: string } | undefined {
  if (node.type !== 'attribute') return undefined
  const object = node.childForFieldName('object') ?? node.namedChildren[0]
  const name = node.childForFieldName('attribute') ?? node.namedChildren[1]
  if (object?.type !== 'identifier' || !name) return undefined
  return { object: object.text, name: name.text }
}

function definitionName(node: Node): string | undefined {
  return node.childForFieldName('name')?.text ?? node.namedChildren.find(child => child.type === 'identifier')?.text
}

interface PyWork {
  node: Node
  prefix: string
  inFunction?: boolean
  className?: string
  firstParam?: string
}

function collectSymbols(state: State, root: Node): void {
  const stack: PyWork[] = [{ node: root, prefix: '' }]
  while (stack.length > 0) {
    const { node, prefix, inFunction, className, firstParam } = stack.pop() as PyWork
    const qualify = (name: string): string => (prefix === '' ? name : `${prefix}.${name}`)

    if (node.type === 'class_definition') {
      if (inFunction) continue
      const name = definitionName(node)
      if (name) {
        addSymbol(state, qualify(name), name, 'class', true, node)
        const body = node.childForFieldName('body')
        if (body) {
          for (let index = body.namedChildren.length - 1; index >= 0; index -= 1) {
            stack.push({ node: body.namedChildren[index] as Node, prefix: qualify(name), className: qualify(name) })
          }
        }
      }
      continue
    }
    if (node.type === 'function_definition') {
      const name = definitionName(node)
      if (name) {
        addSymbol(state, qualify(name), name, 'function', prefix === '', node, { paramCount: formalParamCount(node) })
        const body = node.childForFieldName('body')
        const methodParam = className && prefix === className ? firstParamName(node) : undefined
        if (body) {
          for (let index = body.namedChildren.length - 1; index >= 0; index -= 1) {
            stack.push({
              node: body.namedChildren[index] as Node,
              prefix: qualify(name),
              inFunction: true,
              className,
              firstParam: methodParam
            })
          }
        }
      }
      continue
    }
    if (node.type === 'decorated_definition') {
      const inner = node.namedChildren.find(child => child.type === 'class_definition' || child.type === 'function_definition')
      if (inner) stack.push({ node: inner, prefix, inFunction, className, firstParam })
      continue
    }
    if (node.type === 'global_statement') {
      for (const child of node.namedChildren) {
        if (child.type !== 'identifier') continue
        const existing = state.symbols.find(symbol => symbol.qualifiedName === child.text)
        if (existing) {
          existing.scope = 'module'
          if (existing.mutable === undefined) existing.mutable = !isConstantName(child.text)
        } else {
          addSymbol(state, child.text, child.text, 'variable', true, child, { scope: 'module', mutable: !isConstantName(child.text) })
        }
      }
      continue
    }
    if (node.type === 'assignment' || node.type === 'augmented_assignment') {
      const left = node.childForFieldName('left') ?? node.namedChildren[0]
      if (left) recordAssignment(state, left, { prefix, inFunction: inFunction === true, className, firstParam, node })
      continue
    }
    if (node.type === 'expression_statement') {
      for (let index = node.namedChildren.length - 1; index >= 0; index -= 1) {
        stack.push({ node: node.namedChildren[index] as Node, prefix, inFunction, className, firstParam })
      }
      continue
    }
    if (node.type === 'module' || node.type === 'block' || node.type === 'if_statement' || node.type === 'elif_clause' || node.type === 'else_clause' || node.type === 'try_statement' || node.type === 'except_clause' || node.type === 'for_statement' || node.type === 'while_statement' || node.type === 'with_statement') {
      const body = node.childForFieldName('body')
      const children = body ? body.namedChildren : node.namedChildren
      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push({ node: children[index] as Node, prefix, inFunction, className, firstParam })
      }
    }
  }
}

function recordAssignment(
  state: State,
  left: Node,
  ctx: { prefix: string; inFunction: boolean; className?: string; firstParam?: string; node: Node }
): void {
  const attr = attributeParts(left)
  if (attr && ctx.firstParam && attr.object === ctx.firstParam && ctx.className) {
    const qualifiedName = `${ctx.className}.self.${attr.name}`
    if (!state.symbols.some(symbol => symbol.qualifiedName === qualifiedName)) {
      addSymbol(state, qualifiedName, attr.name, 'variable', false, ctx.node, { scope: 'instance', mutable: true, parent: ctx.className })
    }
    return
  }
  if (ctx.inFunction) return
  const name = identifierOfTarget(left)
  if (!name) return
  if (ctx.className && ctx.prefix === ctx.className) {
    addSymbol(state, `${ctx.className}.${name}`, name, 'variable', false, ctx.node, { scope: 'class', mutable: !isConstantName(name) })
    return
  }
  if (ctx.prefix === '') {
    addSymbol(state, name, name, 'variable', true, ctx.node, { scope: 'module', mutable: !isConstantName(name) })
  }
}

function isDynamicImportCall(node: Node): boolean {
  const callee = node.childForFieldName('function') ?? node.namedChildren[0]
  if (!callee) return false
  return (callee.type === 'identifier' && callee.text === '__import__') || (callee.type === 'attribute' && callee.text.endsWith('.import_module'))
}

function collectCalls(state: State, root: Node): void {
  const functionNames = new Set(state.symbols.filter(symbol => symbol.symbolKind === 'function' || symbol.symbolKind === 'class').map(symbol => symbol.qualifiedName))
  const importLocals = new Map<string, ExtractedBinding>()
  for (const reference of state.references) {
    for (const binding of reference.bindings ?? []) importLocals.set(binding.local, binding)
  }
  const sites: Node[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    if (node.type === 'call') sites.push(node)
    for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push(node.namedChildren[i] as Node)
  }
  sites.sort((a, b) => a.startIndex - b.startIndex || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
  for (const node of sites) {
    if (isDynamicImportCall(node)) continue
    const resolved = resolvePythonCall(node, functionNames, importLocals)
    if (!resolved) {
      state.unresolvedCalls += 1
      continue
    }
    if (state.references.length + state.calls.length >= state.limits.maxEdgesPerFile) {
      state.omitted.edges += 1
      continue
    }
    state.calls.push({
      caller: enclosingPythonCaller(node, functionNames),
      span: nodeSpan(state, node),
      ...(resolved.intraFileCallee ? { intraFileCallee: resolved.intraFileCallee } : {}),
      ...(resolved.importLocal ? { importLocal: resolved.importLocal } : {})
    })
  }
}

function enclosingPythonCaller(node: Node, functionNames: Set<string>): string | null {
  const parts: string[] = []
  let current = node.parent
  while (current) {
    if (current.type === 'function_definition' || current.type === 'class_definition') {
      const name = definitionName(current)
      if (name) parts.push(name)
    }
    current = current.parent
  }
  if (parts.length === 0) return null
  const qualified = parts.reverse().join('.')
  return functionNames.has(qualified) ? qualified : null
}

function resolvePythonCall(
  node: Node,
  functionNames: Set<string>,
  importLocals: Map<string, ExtractedBinding>
): { intraFileCallee?: string; importLocal?: string } | undefined {
  const callee = node.childForFieldName('function') ?? node.namedChildren[0]
  if (!callee) return undefined
  if (callee.type === 'identifier') {
    const prefix = enclosingPythonCaller(node, functionNames)
    const nested = prefix ? `${prefix}.${callee.text}` : callee.text
    if (functionNames.has(nested)) return { intraFileCallee: nested }
    if (functionNames.has(callee.text)) return { intraFileCallee: callee.text }
    if (importLocals.has(callee.text)) return { importLocal: callee.text }
    return undefined
  }
  if (callee.type === 'attribute') {
    const parts = attributeParts(callee)
    if (!parts) return undefined
    const methodOwner = enclosingClassOf(node)
    if (methodOwner && isSelfOrCls(node, parts.object)) {
      const qualified = `${methodOwner}.${parts.name}`
      if (functionNames.has(qualified)) return { intraFileCallee: qualified }
      return undefined
    }
    const qualified = `${parts.object}.${parts.name}`
    if (functionNames.has(qualified)) return { intraFileCallee: qualified }
    if (functionNames.has(parts.object)) {
      const init = `${parts.object}.__init__`
      // attribute call Class.method already handled; Class() is identifier
    }
    const binding = importLocals.get(parts.object)
    if (binding?.imported === '*') return { importLocal: `${parts.object}.${parts.name}` }
    return undefined
  }
  return undefined
}

function enclosingClassOf(node: Node): string | undefined {
  let current = node.parent
  let funcSeen = false
  const parts: string[] = []
  while (current) {
    if (current.type === 'function_definition') {
      funcSeen = true
    } else if (current.type === 'class_definition') {
      const name = definitionName(current)
      if (name) parts.push(name)
    }
    current = current.parent
  }
  if (!funcSeen || parts.length === 0) return undefined
  return parts.reverse().join('.')
}

function isSelfOrCls(node: Node, objectName: string): boolean {
  let current = node.parent
  while (current) {
    if (current.type === 'function_definition') {
      const first = firstParamName(current)
      return first === objectName
    }
    if (current.type === 'class_definition') return false
    current = current.parent
  }
  return false
}

function moduleDocstring(root: Node): string | undefined {
  const first = root.namedChildren.find(child => child.type !== 'comment')
  if (!first) return undefined
  const expr = first.type === 'expression_statement' ? first.namedChildren[0] : first
  if (!expr || expr.type !== 'string') return undefined
  return sanitizeDocSummary(stripPythonString(expr.text))
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
  const state: State = { lines: new LineIndex(content), limits, content, references: [], symbols: [], calls: [], unresolvedCalls: 0, omitted: { longNames: 0, symbols: 0, edges: 0 }, redactions: 0 }

  for (const node of root.descendantsOfType(['import_statement', 'import_from_statement', 'call'])) {
    if (node.type === 'import_statement') handleImportStatement(state, node)
    else if (node.type === 'import_from_statement') handleImportFrom(state, node)
    else handleCall(state, node)
  }
  collectSymbols(state, root)
  collectCalls(state, root)

  state.references.sort(byPosition)
  state.symbols.sort((a, b) => byPosition(a, b) || (a.qualifiedName < b.qualifiedName ? -1 : a.qualifiedName > b.qualifiedName ? 1 : 0))
  state.calls.sort(byPosition)
  const syntaxErrors = collectSyntaxErrors(root, state.lines)
  const fileDocSummary = moduleDocstring(root)
  return {
    references: state.references,
    symbols: state.symbols,
    calls: state.calls,
    unresolvedCalls: state.unresolvedCalls,
    ...(fileDocSummary ? { fileDocSummary } : {}),
    syntaxErrorCount: syntaxErrors.length,
    syntaxErrors,
    omitted: state.omitted,
    redactions: state.redactions
  }
}
