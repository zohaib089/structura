/**
 * Loaded in parser worker threads before any WASM or repo parsing.
 * Blocks process-spawn and network APIs so repository code cannot reach them.
 */
const forbidden = new Set([
  'child_process',
  'node:child_process',
  'cluster',
  'node:cluster',
  'net',
  'node:net',
  'http',
  'node:http',
  'https',
  'node:https',
  'dns',
  'node:dns',
  'tls',
  'node:tls',
  'dgram',
  'node:dgram'
])

const trip = (name: string): never => {
  throw new Error(`tripwire: ${name} is not allowed in the parser worker`)
}

const moduleProxy = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === 'default') return moduleProxy
      trip(String(property))
    },
    apply() {
      trip('dynamic import')
    }
  }
)

for (const name of forbidden) {
  Object.defineProperty(globalThis, name, {
    configurable: false,
    enumerable: false,
    get() {
      trip(name)
    }
  })
}

if (typeof globalThis.fetch === 'function') {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: false,
    enumerable: false,
    value() {
      trip('fetch')
    }
  })
}

for (const name of ['WebSocket', 'EventSource'] as const) {
  if (name in globalThis) {
    Object.defineProperty(globalThis, name, {
      configurable: false,
      enumerable: false,
      value: class {
        constructor() {
          trip(name)
        }
      }
    })
  }
}

Object.defineProperty(globalThis, 'require', {
  configurable: false,
  enumerable: false,
  value: (request: string) => {
    if (forbidden.has(request)) trip(request)
    return moduleProxy
  }
})
