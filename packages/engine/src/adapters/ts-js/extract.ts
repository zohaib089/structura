import type { Node } from 'web-tree-sitter'
import { looksSecret, REDACTED } from '../../redact.js'
import type { Pos, Span, SymbolKind } from '../../graph/types.js'
import type { AdapterParseResult, ExtractedBinding, ExtractedCall, ExtractedReference, ExtractedSymbol, ExtractLimits } from '../adapter.js'
import { sanitizeDocSummary, unwrapComment } from '../doc-summary.js'

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
  'default_type',
  'type_arguments',
  'type_parameters'
])
const SCOPE_BOUNDARIES = new Set(['statement_block', 'lexical_declaration', 'variable_declaration', 'program'])

export interface ExtractContext {
  vue?: boolean
  scriptSetup?: boolean
}

interface State {
  lines: LineIndex
  limits: ExtractLimits
  content: string
  context?: ExtractContext
  references: ExtractedReference[]
  symbols: ExtractedSymbol[]
  calls: ExtractedCall[]
  unresolvedCalls: number
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
    edgeType,
    importKind,
    typeOnly,
    specifier,
    redacted,
    span: nodeSpan(state, node),
    ...(names && names.length > 0 ? { names } : {}),
    ...(bindings && bindings.length > 0 ? { bindings } : {})
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

function specifierBinding(item: Node): ExtractedBinding | undefined {
  const imported = importedName(item)
  if (!imported) return undefined
  const alias = item.childForFieldName('alias')
  if (alias && alias.text) return { local: alias.text, imported }
  const idents = item.namedChildren.filter(child => child.type === 'identifier')
  if (idents.length >= 2) return { local: (idents[idents.length - 1] as Node).text, imported }
  return { local: imported, imported }
}

function bindingsFromClause(node: Node): ExtractedBinding[] | undefined {
  const bindings: ExtractedBinding[] = []
  const requireClause = node.children.find(child => child.type === 'import_require_clause')
  if (requireClause) {
    const ident = requireClause.children.find(child => child.type === 'identifier')
    if (ident) bindings.push({ local: ident.text, imported: 'default' })
    return bindings.length > 0 ? bindings : undefined
  }
  const clause = node.children.find(child => child.type === 'import_clause' || child.type === 'export_clause')
  if (!clause) return undefined
  for (const child of clause.children) {
    if (child.type === 'identifier') bindings.push({ local: child.text, imported: 'default' })
    else if (child.type === 'namespace_import' || child.type === 'namespace_export') {
      const ident = child.children.find(part => part.type === 'identifier')
      if (ident) bindings.push({ local: ident.text, imported: '*' })
    } else if (child.type === 'import_specifier' || child.type === 'export_specifier') {
      const binding = specifierBinding(child)
      if (binding) bindings.push(binding)
    } else if (child.type === 'named_imports') {
      for (const item of child.children) {
        if (item.type !== 'import_specifier') continue
        const binding = specifierBinding(item)
        if (binding) bindings.push(binding)
      }
    }
  }
  return bindings.length > 0 ? bindings : undefined
}

function handleImportStatement(state: State, node: Node): void {
  const requireClause = node.children.find(child => child.type === 'import_require_clause')
  if (requireClause) {
    addReference(state, node, 'imports', 'require', hasTypeKeyword(node), literalValue(requireClause.children.find(child => child.type === 'string') ?? null), namesFromClause(node), bindingsFromClause(node))
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
  addReference(state, node, 'imports', 'static', hasTypeKeyword(node) || (sawBinding && allTypeOnly), literalValue(node.childForFieldName('source')), namesFromClause(node), bindingsFromClause(node))
}

function reexportIsTypeOnly(node: Node): boolean {
  if (hasTypeKeyword(node)) return true
  if (/^export\s+type\b/.test(node.text)) return true
  let sawExport = false
  for (const child of node.children) {
    if (child.type === 'type' && !child.isNamed) return true
    if (child.type === 'namespace_export') sawExport = true
  }
  if (sawExport && node.children.some(child => child.type === 'type' && !child.isNamed)) return true
  const clause = node.children.find(child => child.type === 'export_clause')
  if (!clause) return false
  let sawBinding = false
  let allTypeOnly = true
  for (const item of clause.namedChildren) {
    if (item.type !== 'export_specifier') continue
    sawBinding = true
    if (!item.children.some(part => part.type === 'type' && !part.isNamed)) allTypeOnly = false
  }
  return sawBinding && allTypeOnly
}

function handleReexport(state: State, node: Node, source: Node): void {
  addReference(state, node, 'reexports', 'static', reexportIsTypeOnly(node), literalValue(source), namesFromClause(node), bindingsFromClause(node))
}

function importSiteIsTypeOnly(node: Node): boolean {
  if (isInTypeContext(node)) return true
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'type_query' || current.type === 'type_arguments' || current.type === 'type_parameters') return true
    if (current.type === 'unary_expression' && current.children.some(part => part.type === 'typeof' && !part.isNamed)) return true
  }
  return false
}

function handleCallExpression(state: State, node: Node): void {
  const callee = node.childForFieldName('function')
  if (!callee) return
  let kind: 'dynamic' | 'require'
  if (callee.type === 'import') kind = 'dynamic'
  else if (callee.type === 'identifier' && callee.text === 'require') kind = 'require'
  else return
  const first = node.childForFieldName('arguments')?.namedChildren.find(child => child.type !== 'comment') ?? null
  addReference(state, node, 'imports', kind, kind === 'dynamic' && importSiteIsTypeOnly(node), literalValue(first))
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
  const allowDoc = symbolKind === 'function' || symbolKind === 'class' || symbolKind === 'default'
  const docSummary = allowDoc ? (extras.docSummary ?? docForNode(node)) : extras.docSummary
  const symbol: ExtractedSymbol = {
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
  }
  state.symbols.push(symbol)
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
  inFunction?: boolean
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
  const fromVue = importedFromVueFactory(state)
  const vueState = (value: Node | null): Partial<ExtractedSymbol> | undefined => {
    if (!value || value.type !== 'call_expression') return undefined
    const callee = callCallee(value)
    if (!callee) return undefined
    const kind = vueStateFromCall(callee, state.context?.scriptSetup === true, fromVue)
    if (!kind) return undefined
    return { stateKind: kind.stateKind, mutable: kind.mutable, scope: 'module' }
  }

  while (stack.length > 0) {
    const { node, prefix, exported, inFunction } = stack.pop() as Work
    const qualify = (name: string): string => (prefix === '' ? name : `${prefix}.${name}`)

    if (inFunction) {
      const fnKind = DECLARATION_KINDS[node.type]
      if (fnKind === 'function') {
        const name = node.childForFieldName('name')
        const label = name ? (name.type === 'string' ? literalValue(name) : name.text) : undefined
        if (label) {
          addSymbol(state, qualify(label), label, 'function', false, node, { paramCount: paramCountOf(node) })
          const body = node.childForFieldName('body')
          if (body) {
            for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: qualify(label), exported: false, inFunction: true })
          }
        }
        continue
      }
      if (fnKind === 'class' || fnKind === 'namespace' || fnKind === 'interface' || fnKind === 'enum' || fnKind === 'type') continue
      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        for (const declarator of node.namedChildren) {
          if (declarator.type !== 'variable_declarator') continue
          const target = declarator.childForFieldName('name')
          const value = declarator.childForFieldName('value')
          if (!target || !isFunctionValue(value) || target.type !== 'identifier') continue
          addSymbol(state, qualify(target.text), target.text, 'function', false, declarator, { paramCount: paramCountOf(declarator) })
          const body = value!.childForFieldName('body')
          if (body) {
            const children = body.type === 'statement_block' || body.type === 'class_body' ? body.namedChildren : [body]
            for (let i = children.length - 1; i >= 0; i -= 1) stack.push({ node: children[i] as Node, prefix: qualify(target.text), exported: false, inFunction: true })
          }
        }
        continue
      }
      for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) {
        stack.push({ node: node.namedChildren[i] as Node, prefix, exported: false, inFunction: true })
      }
      continue
    }

    if (node.type === 'export_statement') {
      const source = node.childForFieldName('source')
      if (source) continue
      const declaration = node.childForFieldName('declaration')
      if (node.children.some(child => child.type === 'default' && !child.isNamed)) {
        const target = declaration ?? node.childForFieldName('value') ?? node
        addSymbol(state, 'default', 'default', 'default', true, target, {
          ...(isFunctionValue(target) || target.type === 'function_declaration' || target.type === 'generator_function_declaration' ? { paramCount: paramCountOf(target) } : {})
        })
        if (isFunctionValue(target) || target.type === 'function_declaration' || target.type === 'generator_function_declaration') {
          const body = target.childForFieldName('body')
          if (body) {
            for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: 'default', exported: false, inFunction: true })
          }
        }
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
      if (node.text.startsWith('declare module')) continue
      for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: node.namedChildren[i] as Node, prefix, exported })
      continue
    }

    const kind = DECLARATION_KINDS[node.type]
    if (kind) {
      const name = node.childForFieldName('name')
      const label = name ? (name.type === 'string' ? literalValue(name) : name.text) : undefined
      if (label) {
        addSymbol(state, qualify(label), label, kind, exported, node, {
          ...(kind === 'function' ? { paramCount: paramCountOf(node) } : {})
        })
        const body = node.childForFieldName('body')
        if (body && (kind === 'class' || kind === 'namespace')) {
          for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: qualify(label), exported })
        }
        if (body && kind === 'function') {
          for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: qualify(label), exported: false, inFunction: true })
        }
      }
      continue
    }
    const memberKind = MEMBER_KINDS[node.type]
    if (memberKind && prefix !== '') {
      const label = memberName(node)
      if (label) {
        if (memberKind === 'function') {
          addSymbol(state, qualify(label), label, memberKind, exported, node, { paramCount: paramCountOf(node) })
          const body = node.childForFieldName('body')
          if (body) {
            for (let i = body.namedChildren.length - 1; i >= 0; i -= 1) stack.push({ node: body.namedChildren[i] as Node, prefix: qualify(label), exported: false, inFunction: true })
          }
        } else {
          addSymbol(state, qualify(label), label, memberKind, exported, node, {
            scope: 'class',
            mutable: !fieldIsReadonly(node)
          })
        }
      }
      continue
    }
    if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
      const mutable = declarationMutability(node)
      for (const declarator of node.namedChildren) {
        if (declarator.type !== 'variable_declarator') continue
        const target = declarator.childForFieldName('name')
        if (!target) continue
        const value = declarator.childForFieldName('value')
        const isFunction = isFunctionValue(value)
        const stateFields = !isFunction ? (vueState(value) ?? (prefix === '' ? { scope: 'module' as const, mutable } : undefined)) : undefined
        for (const nameNode of patternNames(target)) {
          if (isFunction && target.type === 'identifier') {
            addSymbol(state, qualify(nameNode.text), nameNode.text, 'function', exported, declarator, { paramCount: paramCountOf(declarator) })
            const body = value?.childForFieldName('body')
            if (body) {
              const children = body.type === 'statement_block' ? body.namedChildren : [body]
              for (let i = children.length - 1; i >= 0; i -= 1) stack.push({ node: children[i] as Node, prefix: qualify(nameNode.text), exported: false, inFunction: true })
            }
          } else {
            addSymbol(state, qualify(nameNode.text), nameNode.text, 'variable', exported, declarator, stateFields ?? {})
          }
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

function edgeBudgetRemaining(state: State): boolean {
  return state.references.length + state.calls.length < state.limits.maxEdgesPerFile
}

function leadingCommentRaw(node: Node): string | undefined {
  const comments: string[] = []
  let prev = node.previousSibling
  while (prev && prev.type === 'comment') {
    comments.push(prev.text)
    prev = prev.previousSibling
  }
  if (comments.length === 0) return undefined
  comments.reverse()
  const last = comments[comments.length - 1] as string
  if (last.trim().startsWith('/*')) return last
  return comments.filter(text => text.trim().startsWith('//')).join('\n')
}

function docForNode(node: Node): string | undefined {
  let current: Node | null = node
  for (let depth = 0; depth < 3 && current; depth += 1) {
    const raw = leadingCommentRaw(current)
    if (raw) return sanitizeDocSummary(unwrapComment(raw))
    current = current.parent
  }
  return undefined
}

function fileLeadingDoc(root: Node): string | undefined {
  for (const child of root.children) {
    if (child.type === 'comment') {
      const summary = sanitizeDocSummary(unwrapComment(child.text))
      if (summary) return summary
      continue
    }
    if (child.isNamed) return docForNode(child)
  }
  return undefined
}

function paramCountOf(node: Node | null | undefined): number | undefined {
  if (!node) return undefined
  const target = node.type === 'variable_declarator' ? node.childForFieldName('value') : node
  if (!target) return undefined
  if (target.type === 'arrow_function') {
    const params = target.childForFieldName('parameters') ?? target.childForFieldName('formal_parameters')
    if (!params) {
      const ident = target.namedChildren.find(child => child.type === 'identifier')
      return ident ? 1 : 0
    }
    return countFormals(params)
  }
  const params = target.childForFieldName('parameters') ?? target.childForFieldName('formal_parameters') ?? target.namedChildren.find(child => child.type === 'formal_parameters')
  if (!params) return undefined
  return countFormals(params)
}

function countFormals(params: Node): number {
  let count = 0
  for (const child of params.namedChildren) {
    if (child.type === 'comment') continue
    if (isThisParameter(child)) continue
    count += 1
  }
  return count
}

function isThisParameter(node: Node): boolean {
  if (node.type === 'this' || node.type === 'this_parameter') return true
  if (node.text === 'this' || /^this\s*:/.test(node.text)) return true
  const name = node.childForFieldName('pattern') ?? node.childForFieldName('name') ?? node.namedChildren[0]
  return name?.type === 'this' || (name?.type === 'identifier' && name.text === 'this')
}

function declarationMutability(node: Node): boolean {
  if (node.type === 'variable_declaration') return true
  return node.children.some(child => (child.type === 'let' || child.type === 'var') && !child.isNamed)
}

function fieldIsReadonly(node: Node): boolean {
  return node.children.some(child => child.type === 'readonly' && !child.isNamed)
}

function isFunctionValue(node: Node | null): boolean {
  return node !== null && (node.type === 'arrow_function' || node.type === 'function_expression' || node.type === 'function' || node.type === 'generator_function')
}

function callCallee(node: Node): Node | null {
  return node.childForFieldName('function')
    ?? node.childForFieldName('constructor')
    ?? node.namedChildren[0]
    ?? null
}

function staticMemberName(node: Node): { object: Node; name: string } | undefined {
  if (node.type !== 'member_expression' && node.type !== 'property_identifier') return undefined
  const object = node.childForFieldName('object') ?? node.namedChildren[0]
  const property = node.childForFieldName('property') ?? node.childForFieldName('name') ?? node.namedChildren[1]
  if (!object || !property) return undefined
  if (property.type === 'computed_property_name' || property.type === 'subscript_expression') return undefined
  if (node.children.some(child => child.type === '[' || (child.type === 'computed_property_name'))) return undefined
  const name = property.type === 'string' ? literalValue(property) : property.text
  if (!name) return undefined
  return { object, name }
}

function vueStateFromCall(callee: Node, scriptSetup: boolean, importedFromVue: (local: string) => boolean): { stateKind: NonNullable<ExtractedSymbol['stateKind']>; mutable: boolean } | undefined {
  let name: string | undefined
  let receiver: string | undefined
  if (callee.type === 'identifier') name = callee.text
  else {
    const member = staticMemberName(callee)
    if (member && member.object.type === 'identifier') {
      receiver = member.object.text
      name = member.name
    }
  }
  if (!name) return undefined
  const allowed = scriptSetup || importedFromVue(name) || (receiver !== undefined && importedFromVue(receiver))
  if (!allowed) return undefined
  if (name === 'computed') return { stateKind: 'computed', mutable: false }
  if (name === 'ref') return { stateKind: 'ref', mutable: true }
  if (name === 'reactive') return { stateKind: 'reactive', mutable: true }
  if (name === 'defineProps') return { stateKind: 'prop', mutable: false }
  if (name === 'defineStore' || /^use[A-Z]\w*Store$/.test(name)) return { stateKind: 'store', mutable: true }
  if (name === 'provide') return { stateKind: 'provide', mutable: true }
  if (name === 'inject') return { stateKind: 'inject', mutable: true }
  return undefined
}

function importedFromVueFactory(state: State): (local: string) => boolean {
  const vueish = new Set<string>()
  for (const reference of state.references) {
    const spec = reference.specifier ?? ''
    const ok = spec === 'vue' || spec === 'pinia' || spec === '@vue/reactivity' || spec.startsWith('@vue/') || spec.startsWith('pinia/')
    if (!ok) continue
    for (const binding of reference.bindings ?? []) vueish.add(binding.local)
  }
  return (local: string) => vueish.has(local)
}

function collectGlobals(state: State, root: Node): void {
  const shadowed = new Set(state.symbols.filter(symbol => symbol.qualifiedName === 'window' || symbol.qualifiedName === 'globalThis').map(symbol => symbol.qualifiedName))
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    if (node.type === 'assignment_expression' || node.type === 'augmented_assignment_expression') {
      const left = node.childForFieldName('left') ?? node.namedChildren[0]
      if (left) maybeGlobalAssignment(state, left, shadowed)
    }
    for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push(node.namedChildren[i] as Node)
  }
}

function maybeGlobalAssignment(state: State, left: Node, shadowed: Set<string>): void {
  const member = staticMemberName(left)
  if (!member || member.object.type !== 'identifier') return
  const rootName = member.object.text
  if (rootName !== 'globalThis' && rootName !== 'window') return
  if (shadowed.has(rootName)) return
  const qualifiedName = `${rootName}.${member.name}`
  if (state.symbols.some(symbol => symbol.qualifiedName === qualifiedName)) return
  addSymbol(state, qualifiedName, member.name, 'variable', false, left, {
    scope: 'global',
    mutable: true
  })
}

function collectVueOptions(state: State, root: Node): void {
  if (!state.context?.vue || state.context.scriptSetup) return
  const objects: Node[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    if (node.type === 'export_statement' && node.children.some(child => child.type === 'default' && !child.isNamed)) {
      const value = node.childForFieldName('value') ?? node.childForFieldName('declaration') ?? node.namedChildren.find(child => child.type === 'object' || child.type === 'call_expression' || child.type === 'class_declaration')
      const object = value ? optionsObject(value) : null
      if (object) objects.push(object)
      continue
    }
    for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push(node.namedChildren[i] as Node)
  }
  for (const object of objects) addOptionsState(state, object)
}

function optionsObject(value: Node): Node | null {
  if (value.type === 'object') return value
  if (value.type === 'call_expression') {
    const args = value.childForFieldName('arguments') ?? value.namedChildren.find(child => child.type === 'arguments')
    const first = args?.namedChildren.find(child => child.type !== 'comment') ?? null
    return first?.type === 'object' ? first : null
  }
  return null
}

function addOptionsState(state: State, object: Node): void {
  for (const child of object.namedChildren) {
    if (child.type !== 'pair' && child.type !== 'method_definition') continue
    const key = pairKey(child)
    const value = child.type === 'pair' ? child.childForFieldName('value') : child
    if (!key || !value) continue
    if (key === 'props') {
      for (const name of optionNames(value)) {
        addSymbol(state, name, name, 'variable', false, value, { scope: 'module', mutable: false, stateKind: 'prop' })
      }
    } else if (key === 'data') {
      const returned = returnedObject(value)
      for (const name of optionNames(returned ?? value)) {
        addSymbol(state, name, name, 'variable', false, value, { scope: 'module', mutable: true, stateKind: 'binding' })
      }
    } else if (key === 'provide') {
      const returned = returnedObject(value)
      for (const name of optionNames(returned ?? value)) {
        addSymbol(state, name, name, 'variable', false, value, { scope: 'module', mutable: true, stateKind: 'provide' })
      }
    } else if (key === 'inject') {
      for (const name of optionNames(value)) {
        addSymbol(state, name, name, 'variable', false, value, { scope: 'module', mutable: true, stateKind: 'inject' })
      }
    }
  }
}

function pairKey(node: Node): string | undefined {
  const key = node.childForFieldName('key') ?? node.childForFieldName('name') ?? node.namedChildren[0]
  if (!key || key.type === 'computed_property_name') return undefined
  if (key.type === 'string') return literalValue(key)
  return key.text
}

function optionNames(node: Node): string[] {
  if (node.type === 'object') {
    const names: string[] = []
    for (const child of node.namedChildren) {
      if (child.type === 'pair' || child.type === 'method_definition' || child.type === 'shorthand_property_identifier') {
        const key = child.type === 'shorthand_property_identifier' ? child.text : pairKey(child)
        if (key) names.push(key)
      }
    }
    return names
  }
  if (node.type === 'array') {
    const names: string[] = []
    for (const child of node.namedChildren) {
      if (child.type === 'string') {
        const value = literalValue(child)
        if (value) names.push(value)
      }
    }
    return names
  }
  return []
}

function returnedObject(node: Node): Node | null {
  const body = node.childForFieldName('body') ?? (isFunctionValue(node) ? node.childForFieldName('body') : null)
  const target = body ?? node
  if (target.type === 'object') return target
  if (target.type === 'statement_block' || target.type === 'block') {
    for (const child of target.namedChildren) {
      if (child.type === 'return_statement') {
        const value = child.namedChildren.find(part => part.type === 'object')
        if (value) return value
      }
    }
  }
  return null
}

function collectCalls(state: State, root: Node): void {
  const functionNames = new Set(state.symbols.filter(symbol => symbol.symbolKind === 'function' || symbol.symbolKind === 'class' || symbol.symbolKind === 'default').map(symbol => symbol.qualifiedName))
  const importLocals = new Map<string, ExtractedBinding & { namespace: boolean }>()
  for (const reference of state.references) {
    for (const binding of reference.bindings ?? []) {
      importLocals.set(binding.local, { ...binding, namespace: binding.imported === '*' })
    }
  }
  const sites: Node[] = []
  const stack: Node[] = [root]
  while (stack.length > 0) {
    const node = stack.pop() as Node
    if (node.type === 'call_expression' || node.type === 'new_expression') sites.push(node)
    for (let i = node.namedChildren.length - 1; i >= 0; i -= 1) stack.push(node.namedChildren[i] as Node)
  }
  sites.sort((a, b) => a.startIndex - b.startIndex || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0))
  for (const node of sites) {
    if (isImportOrRequireCall(node) || isInTypeContext(node)) continue
    const resolved = resolveCall(state, node, functionNames, importLocals)
    if (!resolved) {
      state.unresolvedCalls += 1
      continue
    }
    if (!edgeBudgetRemaining(state)) {
      state.omitted.edges += 1
      continue
    }
    state.calls.push({
      caller: enclosingCaller(node, functionNames),
      span: nodeSpan(state, node),
      ...(resolved.intraFileCallee ? { intraFileCallee: resolved.intraFileCallee } : {}),
      ...(resolved.importLocal ? { importLocal: resolved.importLocal } : {})
    })
  }
}

function isImportOrRequireCall(node: Node): boolean {
  if (node.type !== 'call_expression') return false
  const callee = node.childForFieldName('function')
  if (!callee) return false
  return callee.type === 'import' || (callee.type === 'identifier' && callee.text === 'require')
}

function enclosingCaller(node: Node, functionNames: Set<string>): string | null {
  let current = node.parent
  while (current) {
    const name = symbolNameForFunctionNode(current)
    if (name && functionNames.has(name.qualifiedName)) return name.qualifiedName
    current = current.parent
  }
  return null
}

function symbolNameForFunctionNode(node: Node): { qualifiedName: string } | undefined {
  if (node.type === 'function_declaration' || node.type === 'generator_function_declaration' || node.type === 'function_signature' || node.type === 'method_definition' || node.type === 'abstract_method_signature') {
    const label = node.type === 'method_definition' || node.type === 'abstract_method_signature' ? memberName(node) : node.childForFieldName('name')?.text
    if (!label) return undefined
    const prefix = ancestorPrefix(node)
    return { qualifiedName: prefix ? `${prefix}.${label}` : label }
  }
  if (isFunctionValue(node) && node.parent?.type === 'variable_declarator') {
    const ident = node.parent.childForFieldName('name')
    if (ident?.type === 'identifier') {
      const prefix = ancestorPrefix(node.parent)
      return { qualifiedName: prefix ? `${prefix}.${ident.text}` : ident.text }
    }
  }
  return undefined
}

function ancestorPrefix(node: Node): string {
  const parts: string[] = []
  let current = node.parent
  while (current) {
    if (current.type === 'class_declaration' || current.type === 'abstract_class_declaration' || current.type === 'internal_module' || current.type === 'module' || current.type === 'function_declaration' || current.type === 'generator_function_declaration') {
      const name = current.childForFieldName('name')
      const label = name ? (name.type === 'string' ? literalValue(name) : name.text) : undefined
      if (label) parts.push(label)
    } else if (current.type === 'method_definition') {
      const label = memberName(current)
      if (label) parts.push(label)
    } else if (isFunctionValue(current) && current.parent?.type === 'variable_declarator') {
      const ident = current.parent.childForFieldName('name')
      if (ident?.type === 'identifier') parts.push(ident.text)
    }
    current = current.parent
  }
  return parts.reverse().join('.')
}

function resolveCall(
  state: State,
  node: Node,
  functionNames: Set<string>,
  importLocals: Map<string, ExtractedBinding & { namespace: boolean }>
): { intraFileCallee?: string; importLocal?: string } | undefined {
  if (node.type === 'new_expression') {
    const callee = callCallee(node)
    if (!callee || callee.type !== 'identifier') return undefined
    const ctor = `${callee.text}.constructor`
    if (functionNames.has(ctor)) return { intraFileCallee: ctor }
    if (functionNames.has(callee.text)) return { intraFileCallee: callee.text }
    const binding = importLocals.get(callee.text)
    if (binding) return { importLocal: binding.local }
    return undefined
  }
  const callee = callCallee(node)
  if (!callee) return undefined
  if (callee.type === 'identifier') {
    const prefix = enclosingCaller(node, functionNames)
    const nested = prefix ? `${prefix}.${callee.text}` : callee.text
    if (functionNames.has(nested)) return { intraFileCallee: nested }
    if (functionNames.has(callee.text)) return { intraFileCallee: callee.text }
    if (importLocals.has(callee.text)) return { importLocal: callee.text }
    return undefined
  }
  const member = staticMemberName(callee)
  if (!member) return undefined
  if (member.object.type === 'this' || (member.object.type === 'identifier' && (member.object.text === 'this' || member.object.text === 'self'))) {
    const owner = enclosingClassName(node)
    if (!owner) return undefined
    const qualified = `${owner}.${member.name}`
    if (functionNames.has(qualified)) return { intraFileCallee: qualified }
    return undefined
  }
  if (member.object.type === 'identifier') {
    const className = member.object.text
    const qualified = `${className}.${member.name}`
    if (functionNames.has(qualified) || functionNames.has(className)) {
      if (functionNames.has(qualified)) return { intraFileCallee: qualified }
    }
    const binding = importLocals.get(className)
    if (binding?.namespace) return { importLocal: `${className}.${member.name}` }
    if (binding) return undefined
  }
  return undefined
}

function enclosingClassName(node: Node): string | undefined {
  let current = node.parent
  while (current) {
    if (current.type === 'class_declaration' || current.type === 'abstract_class_declaration') {
      const name = current.childForFieldName('name')
      return name ? (name.type === 'string' ? literalValue(name) : name.text) : undefined
    }
    current = current.parent
  }
  return undefined
}

/** Walks a tree-sitter tree (TypeScript, TSX or JavaScript grammar) and extracts module facts. */
export function extractModuleFacts(root: Node, content: string, limits: ExtractLimits, context?: ExtractContext): AdapterParseResult {
  const state: State = { lines: new LineIndex(content), limits, content, context, references: [], symbols: [], calls: [], unresolvedCalls: 0, omitted: { longNames: 0, symbols: 0, edges: 0 }, redactions: 0 }

  for (const node of root.descendantsOfType(['import_statement', 'export_statement', 'call_expression'])) {
    if (!node) continue
    if (node.type === 'import_statement') handleImportStatement(state, node)
    else if (node.type === 'export_statement') {
      const source = node.childForFieldName('source')
      if (source) handleReexport(state, node, source)
    } else handleCallExpression(state, node)
  }
  collectSymbols(state, root)
  collectGlobals(state, root)
  collectVueOptions(state, root)
  collectCalls(state, root)

  state.references.sort(byPosition)
  state.symbols.sort((a, b) => byPosition(a, b) || (a.qualifiedName < b.qualifiedName ? -1 : a.qualifiedName > b.qualifiedName ? 1 : 0))
  state.calls.sort(byPosition)
  const syntaxErrors = collectSyntaxErrors(root, state.lines)
  const fileDocSummary = fileLeadingDoc(root)
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
