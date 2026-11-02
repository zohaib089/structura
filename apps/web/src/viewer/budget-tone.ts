export type BudgetTone = 'neutral' | 'detail' | 'limit'

/** Neutral through the comfort budget. Info above it. Warning at the hard cap. */
export function budgetTone(visible: number, comfort: number, cap: number): BudgetTone {
  if (visible >= cap) return 'limit'
  if (visible > comfort) return 'detail'
  return 'neutral'
}
