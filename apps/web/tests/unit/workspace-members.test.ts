import { describe, expect, it } from 'vitest'
import {
  canManageWorkspaceMember,
  isLastOwnerRefusal,
  roleOptionsFor
} from '../../src/services/workspace-members'

describe('workspace member permissions', () => {
  it('lets owners manage any role, including promoting someone to owner', () => {
    expect(canManageWorkspaceMember('owner', 'member', 'owner')).toBe(true)
    expect(canManageWorkspaceMember('owner', 'admin')).toBe(true)
    expect(canManageWorkspaceMember('owner', 'owner', 'member')).toBe(true)
    expect(roleOptionsFor('owner', 'admin')).toEqual(['owner', 'admin', 'member'])
  })

  it('lets admins manage members and other admins, but not owners', () => {
    expect(canManageWorkspaceMember('admin', 'member', 'admin')).toBe(true)
    expect(canManageWorkspaceMember('admin', 'admin', 'member')).toBe(true)
    expect(canManageWorkspaceMember('admin', 'owner')).toBe(false)
    expect(canManageWorkspaceMember('admin', 'member', 'owner')).toBe(false)
    expect(roleOptionsFor('admin', 'member')).toEqual(['admin', 'member'])
    expect(roleOptionsFor('admin', 'owner')).toEqual([])
  })

  it('does not let ordinary members change or remove anyone', () => {
    expect(canManageWorkspaceMember('member', 'member')).toBe(false)
    expect(canManageWorkspaceMember('member', 'admin', 'member')).toBe(false)
    expect(roleOptionsFor('member', 'member')).toEqual([])
  })

  it('recognizes the server last-owner refusal', () => {
    expect(isLastOwnerRefusal('A workspace must keep at least one owner.')).toBe(true)
    expect(isLastOwnerRefusal('Workspace not found.')).toBe(false)
  })
})
