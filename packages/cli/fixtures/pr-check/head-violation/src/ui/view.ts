import { query } from '../db/query'

export function render(): string {
  return query('select name from users').join(', ')
}
