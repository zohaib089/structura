import { query } from '../db/query'
import { USERS_LABEL } from '../ui/labels'

export function listUsers(): string[] {
  return [USERS_LABEL, ...query('select name from users')]
}
