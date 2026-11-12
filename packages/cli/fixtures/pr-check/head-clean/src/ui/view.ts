import { listUsers } from '../services/users'
import { title } from './format'

export function render(): string {
  return title(listUsers().join(', '))
}
