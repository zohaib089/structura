import { query } from '../db/query'

export function listUsers(): string[] {
  return query('select name from users')
}
