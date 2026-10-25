/**
 * Single source of truth for every product-facing name used by the engine and CLI.
 *
 * The product name is confirmed as "Atlasmith" by the owner (brand file from the Designer). To rename it change the
 * primitives below and the `package.json` names/bin (a test in `brand.test.ts` fails if
 * those drift). Nothing else in the code base may hard-code these values, and none of
 * them may ever appear inside graph.json (it is brand-free by contract).
 */

/** Human readable product name. */
export const PRODUCT_NAME = 'Atlasmith'

/** Lowercase slug; drives the bin name, directories, ignore file and env prefix. */
export const PRODUCT_SLUG = 'atlasmith'

/** npm scope used by the workspace packages (`@scope/engine`, `@scope/cli`). */
export const PACKAGE_SCOPE = '@atlasmith'

/** Executable name (the `bin` key of the CLI package). */
export const CLI_BIN = PRODUCT_SLUG

/** Declared-architecture file (drift checks; consumed by a later task). */
export const CONFIG_FILE = `${PRODUCT_SLUG}.yml`

/** Default output directory (relative to the scanned root): graph.json and run.json go here. */
export const OUT_DIR = `.${PRODUCT_SLUG}`

/** Content-hash / extraction cache directory (relative to the scanned root). */
export const CACHE_DIR = `${OUT_DIR}/cache`

/** Prefix of environment variables the tool reads (`ATLASMITH_NO_COLOR`...), prefix includes the underscore. */
export const ENV_PREFIX = `${PRODUCT_SLUG.toUpperCase()}_`

/** Tool-specific ignore file, same syntax as `.gitignore`. */
export const IGNORE_FILE = `.${PRODUCT_SLUG}ignore`

/** Previous working name. Only the existing apps and legacy notes may still use it; never used by new code. */
export const LEGACY_SLUG = 'structura'

/** Default file names inside the output directory. */
export const GRAPH_FILE = 'graph.json'
export const RUN_FILE = 'run.json'

/** Package names derived from the scope. */
export const ENGINE_PACKAGE_NAME = `${PACKAGE_SCOPE}/engine`
export const CLI_PACKAGE_NAME = `${PACKAGE_SCOPE}/cli`

export const BRAND = Object.freeze({
  PRODUCT_NAME,
  PRODUCT_SLUG,
  PACKAGE_SCOPE,
  CLI_BIN,
  CONFIG_FILE,
  OUT_DIR,
  CACHE_DIR,
  ENV_PREFIX
})
