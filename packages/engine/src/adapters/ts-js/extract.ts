import type { Node } from 'web-tree-sitter'
import { looksSecret, REDACTED } from '../../redact.js'
import type { Pos, Span, SymbolKind } from '../../graph/types.js'
import type { AdapterParseResult, ExtractedReference, ExtractedSymbol, ExtractLimits } from '../adapter.js'

/** Specifiers longer than this are never stored; they are replaced by this marker. */
export const TOO_LONG = '[too-long]'

/**
 * Converts UTF-16 string offsets into 1-based line / column positions.
 * `\n` is the ONLY line break ("\r\n" is one break because it ends in "\n"; a lone "\r" is not a break),
 * columns count UTF-16 code units. The input must already be free of a leading BOM.
 */
export class LineIndex {
  private readonly lineStarts: number[] = [0]

  constructor(text: string) {
    for (let index = text.indexOf('\n'); index !== -1; index = text.indexOf('\n', index + 1)) this.lineStarts.push(index + 1)
  }

  get lineCount(): number {
    return this.lineStarts.length
  }

  position(offset: number): Pos {
    let low = 0
    let high = this.lineStarts.length - 1
    while (low < high) {
      const mid = (low + high + 1) >> 1
      if ((this.lineStarts[mid] as number) <= offset) low = mid
      else high = mid - 1
    }
    return { line: low + 1, col: offset - (this.lineStarts[low] as number) + 1 }
  }

  span(start: number, end: number): Span {
    return { start: this.position(start), end: this.position(Math.max(start, end)) }
  }
}

const TYPE_CONTEXT_NODES = new Set([
  'type_annotation',
  'type_alias_declaration',
  'type_arguments',
  'interface_declaration',
  'extends_type_clause',
  'constraint',
  'default_type'
])
const SCOPE_BOUNDARIES = new Set(['statement_block', 'lexical_declaration', 'variable_declaration', 'program'])

interface State {
  lines: LineIndex
  limits: ExtractLimits
  references: ExtractedReference[]
  symbols: ExtractedSymbol[]
  omitted: { longNames: number; symbols: number; edges: number }
  redactions: number
}

const nodeSpan = (state: State, node: Node): Span => state.lines.span(node.startIndex, node.endIndex)

/** Literal value of a string / substitution-free template node, or `undefined` when not literal. */
function literalValue(node: Node | null): string | undefined {
  if (!node) return undefined
  if (node.type === 'string') {
    let value = ''
    for (const child of node.children) {
      if (child.type === 'string_fragment') value += child.text
      else if (child.type === 'escape_sequence') return undefined
    }
    return value
  }
  if (node.type === 'template_string') {
    let value = ''
    for (const child of node.children) {
      if (child.type === 'string_fragment') value += child.text
      else if (child.type === 'template_substitution' || child.type === 'escape_sequence') return undefined
    }
    return value
  }
  return undefined
}

function hasTypeKeyword(node: Node): boolean {
  for (const child of node.children) {
    if (child.type === 'type' && !child.isNamed) return true
    if (child.type === 'import_clause' || child.type === 'export_clause' || child.type === 'string') return false
  }
  return false
}

function isInTypeContext(node: Node): boolean {
  for (let current = node.parent; current; current = current.parent) {
    if (TYPE_CONTEXT_NODES.has(current.type) || current.type === 'type_query') return true
    if (current.type.endsWith('_statement') || SCOPE_BOUNDARIES.has(current.type)) return false
  }
  return false
}

function addReference(
  state: State,
  node: Node,
  edgeType: 'imports' | 'reexports',
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
    edgeType,
    importKind,
    typeOnly,
    specifier,
    redacted,
    span: nodeSpan(state, node),
    ...(names && names.length > 0 ? { names } : {})
  })
}

function importedName(item: Node): string | undefined {
  const field = item.childForFieldName('name')
  if (field && field.type !== 'computed_property_name') return field.text
  return item.namedChildren.find(child => child.type === 'identifier')?.text
}

function namesFromClause(node: Node): string[] | undefined {
  const names: string[] = []
  const requireClause = node.children.find(child => child.type === 'import_require_clause')
  if (requireClause) {
    const ident = requireClause.children.find(child => child.type === 'identifier')
    if (ident) names.push(ident.text)
    return names.length > 0 ? names : undefined
  }
  const clause = node.children.find(child => child.type === 'import_clause' || child.type === 'export_clause')
  if (!clause) return undefined
  for (const child of clause.children) {
    if (child.type === 'identifier') names.push(child.text)
    else if (child.type === 'namespace_import') {
      const ident = child.children.find(part => part.type === 'identifier')
      if (ident) names.push(ident.text)
    } else if (child.type === 'import_specifier' || child.type === 'export_specifier') {
      const name = importedName(child)
      if (name) names.push(name)
    } else if (child.type === 'named_imports') {
      for (const item of child.children) {
        if (item.type !== 'import_specifier') continue
        const name = importedName(item)
        if (name) names.push(name)
      }
    }
  }
  return names.length > 0 ? names : undefined
}

function handleImportStatement(state: State, node: Node): void {
  const requireClause = node.children.find(child => child.type === 'import_require_clause')
  if (requireClause) {
    addReference(state, node, 'imports', 'require', hasTypeKeyword(node), literalValue(requireClause.children.find(child => child.type === 'string') ?? null), namesFromClause(node))
    return
  }
  let allTypeOnly = true
  let sawBinding = false
  const clause = node.children.find(child => child.type === 'import_clause')
  if (clause) {
    for (const child of clause.children) {
      if (child.type === 'identifier' || child.type === 'namespace_import') {
        sawBinding = true
        allTypeOnly = false
      } else if (child.type === 'named_imports') {
        for (const item of child.children) {
          if (item.type !== 'import_specifier') continue
          sawBinding = true
          if (!item.children.some(part => part.type === 'type' && !part.isNamed)) allTypeOnly = false
        }
      }
    }
  }
  addReference(state, node, 'imports', 'static', hasTypeKeyword(node) || (sawBinding && allTypeOnly), literalValue(node.childForFieldName('source')), namesFromClause(node))
}

function handleReexport(state: State, node: Node, source: Node): void {
  addReference(state, node, 'reexports', 'static', hasTypeKeyword(node), literalValue(source), namesFromClause(node))
}

function handleCallExpression(state: State, node: Node): void {
  const callee = node.childForFieldName('function')
  if (!callee) return
  let kind: 'dynamic' | 'require'
  if (callee.type === 'import') kind = 'dynamic'
  else if (callee.type === 'identifier' && callee.text === 'require') kind = 'require'
  else return
  const first = node.childForFieldName('arguments')?.namedChildren.find(child => child.type !== 'comment') ?? null
  addReference(state, node, 'imports', kind, kind === 'dynamic' && isInTypeContext(node), literalValue(first))
}

const DECLARATION_KINDS: Readonly<Record<string, SymbolKind>> = {
  function_declaration: 'function',
  generator_function_declaration: 'function',
  function_signature: 'function',
  class_declaration: 'class',
  abstract_class_declaration: 'class',
  interface_declaration: 'interface',
  type_alias_declaration: 'type',
  enum_declaration: 'enum',
  internal_module: 'namespace',
  module: 'namespace'
}
const MEMBER_KINDS: Readonly<Record<string, SymbolKind>> = {
  method_definition: 'function',
  abstract_method_signature: 'function',
  public_field_definition: 'variable',
  field_definition: 'variable'
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

/** Iteratively collects the identifier nodes bound by a destructuring pattern. */
function patternNames(root: Node): Node[] {
  const out: Node[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    switch (node.type) {
      case 'identifier':
      case 'shorthand_property_identifier_pattern':
        out.push(node)
        break
      case 'pair_pattern': {
        const value = node.childForFieldName('value')
        if (value) stack.push(value)
        break
      }
      case 'assignment_pattern':
      case 'object_assignment_pattern': {
        const left = node.childForFieldName('left')
        if (left) stack.push(left)
        break
      }
      case 'rest_pattern':
      case 'object_pattern':
      case 'array_pattern':
        for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push(node.namedChildren[i] as Node)
        break
      default:
    }
  }
  return out
}

function memberName(node: Node): string | undefined {
  const name = node.childForFieldName('name')
  if (!name || name.type === 'computed_property_name') return undefined
  return name.type === 'string' ? literalValue(name) : name.text
}

interface Work {
  node: Node
  prefix: string
  exported: boolean
}

/**
 * Collects declarations. Top-level declarations are always recorded (`exported` says whether they
 * are exported); class members and namespace members are recorded with dotted names.
 * Traversal is iterative: nesting depth of hostile input cannot overflow the stack.
 */
function collectSymbols(state: State, root: Node): void {
  const stack: Work[] = []
  for (let i = root.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: root.namedChildren[i] as Node, prefix: '', exported: false })
  const localExports: { local: string; exposed: string; node: Node }[] = []

  while (stack.length > 0) {
    const { node, prefix, exported } = stack.pop() as Work
    const qualify = (name: string): string => (prefix === '' ? name : `${prefix}.${name}`)

    if (node.type === 'export_statement') {
      const source = node.childForFieldName('source')
      if (source) continue
      const declaration = node.childForFieldName('declaration')
      if (node.children.some(child => child.type === 'default' && !child.isNamed)) {
        addSymbol(state, 'default', 'default', 'default', true, declaration ?? node.childForFieldName('value') ?? node)
        continue
      }
      if (declaration) {
        stack.push({ node: declaration, prefix, exported: true })
        continue
      }
      const clause = node.children.find(child => child.type === 'export_clause')
      if (clause) {
        for (const item of clause.namedChildren) {
          if (item.type !== 'export_specifier') continue
          const local = (item.childForFieldName('name') ?? item.namedChildren[0])?.text
          const exposed = (item.childForFieldName('alias') ?? item.childForFieldName('name') ?? item.namedChildren[0])?.text
          if (local && exposed) localExports.push({ local, exposed, node: item })
        }
        continue
      }
      if (node.children.some(child => child.type === '=' && !child.isNamed)) addSymbol(state, 'export=', 'export=', 'unknown', true, node)
      continue
    }
    if (node.type === 'ambient_declaration') {
      for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: node.namedChildren[i] as Node, prefix, exported })
      continue
    }

    const kind = DECLARATION_KINDS[node.type]
    if (kind) {
      const name = node.childForFieldName('name')
      const label = name ? (name.type === 'string' ? literalValue(name) : name.text) : undefined
      if (label) {
        addSymbol(state, qualify(label), label, kind, exported, node)
        const body = node.childForFieldName('body')
        if (body && (kind === 'class' || kind === 'namespace')) {
          for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: qualify(label), exported })
        }
      }
      continue
    }
    const memberKind = MEMBER_KINDS[node.type]
    if (memberKind && prefix !== '') {
      const label = memberName(node)
      if (label) addSymbol(state, qualify(label), label, memberKind, exported, node)
      continue
    }
    if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      for (const declarator of node.namedChildren) {
        if (declarator.type !== 'variable_declarator') continue
        const target = declarator.childForFieldName('name')
        if (!target) continue
        const value = declarator.childForFieldName('value')
        const isFunction = value !== null && (value.type === 'arrow_function' || value.type === 'function_expression' || value.type === 'function')
        for (const nameNode of patternNames(target)) {
          addSymbol(state, qualify(nameNode.text), nameNode.text, isFunction && target.type === 'identifier' ? 'function' : 'variable', exported, declarator)
        }
      }
    }
  }

  for (const { local, exposed, node } of localExports) {
    const existing = state.symbols.find(symbol => symbol.qualifiedName === local)
    if (existing) {
      if (exposed === local) existing.exported = true
      else if (!state.symbols.some(symbol => symbol.qualifiedName === exposed)) addSymbol(state, exposed, exposed, existing.symbolKind, true, node)
    } else if (!state.symbols.some(symbol => symbol.qualifiedName === exposed)) {
      addSymbol(state, exposed, exposed, 'unknown', true, node)
    }
  }
}

/** Outermost ERROR / MISSING regions. Iterative, so hostile nesting cannot overflow the stack. */
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

/** Walks a tree-sitter tree (TypeScript, TSX or JavaScript grammar) and extracts module facts. */
export function extractModuleFacts(root: Node, content: string, limits: ExtractLimits): AdapterParseResult {
  const state: State = { lines: new LineIndex(content), limits, references: [], symbols: [], omitted: { longNames: 0, symbols: 0, edges: 0 }, redactions: 0 }

  for (const node of root.descendantsOfType(['import_statement', 'export_statement', 'call_expression'])) {
    if (!node) continue
    if (node.type === 'import_statement') handleImportStatement(state, node)
    else if (node.type === 'export_statement') {
      const source = node.childForFieldName('source')
      if (source) handleReexport(state, node, source)
    } else handleCallExpression(state, node)
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
