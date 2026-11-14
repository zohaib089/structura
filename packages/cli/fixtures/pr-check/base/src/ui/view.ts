import { listUsers } from '../services/users'

export function render(): string {
  return listUsers().join(', ')
}
