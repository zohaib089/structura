/**
 * Render budgets for the static viewer.
 *
 * The active numbers are the Tech Lead / QA contract (Q-21 / Q-22):
 * at most 300 nodes on the first overview, at most 50 nodes added per
 * expansion, and a hard cap of 1000 visible nodes and 1000 visible edges.
 *
 * The designer's viewer spec (02 §§1 and 4) names a tighter budget of
 * 150 nodes and 300 edges. Those values are recorded here so the
 * discrepancy stays visible. They are not the runtime default.
 * The budget meter still warns at `--graph-budget-warn-at` (0.8) of the
 * active hard cap, so the warning treatment does not depend on 150/300.
 */
export const DESIGNER_NODE_BUDGET = 150
export const DESIGNER_EDGE_BUDGET = 300

export const INITIAL_NODE_CAP = 300
export const EXPAND_NODE_CAP = 50
export const HARD_NODE_CAP = 1000
export const HARD_EDGE_CAP = 1000

export const BUDGET_WARN_AT = 0.8
export const SEARCH_RESULT_CAP = 50
export const FOCUS_DEPTH_MAX = 6

export const GRAPH_BYTE_LIMIT = 150 * 1024 * 1024
export const JSON_MAX_DEPTH = 64
export const JSON_MAX_ERRORS = 20
export const GRAPH_STRING_MAX = 4096

export const SUPPORTED_SCHEMA_MAJOR = 1
export const SUPPORTED_SCHEMA = '1.0.0'

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/** Vue Flow custom node/edge type. Never a graph kind string. */
export const FLOW_NODE_TYPE = 'overview'
export const FLOW_EDGE_TYPE = 'overview'
