import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessProjectScan, hasProjectAccess, isTruthyFlag } from './project-access.js'

test('hasProjectAccess grants owners and admins even when a project is restricted', () => {
  assert.equal(hasProjectAccess('owner', true, false), true)
  assert.equal(hasProjectAccess('admin', true, false), true)
  assert.equal(hasProjectAccess('member', true, false), false)
})

test('hasProjectAccess leaves unrestricted projects open to every member', () => {
  assert.equal(hasProjectAccess('member', false, false), true)
  assert.equal(hasProjectAccess('member', 'false', false), true)
  assert.equal(hasProjectAccess('member', true, true), true)
  assert.equal(hasProjectAccess('member', 't', 't'), true)
})

test('isTruthyFlag accepts boolean and common driver string forms', () => {
  assert.equal(isTruthyFlag(true), true)
  assert.equal(isTruthyFlag('t'), true)
  assert.equal(isTruthyFlag('true'), true)
  assert.equal(isTruthyFlag(false), false)
  assert.equal(isTruthyFlag('f'), false)
  assert.equal(isTruthyFlag(null), false)
})

test('canAccessProjectScan keeps scans with no project visible to workspace members', () => {
  assert.equal(canAccessProjectScan('member', null, true, false), true)
  assert.equal(canAccessProjectScan('member', undefined, true, false), true)
  assert.equal(canAccessProjectScan('member', '', true, false), true)
  assert.equal(canAccessProjectScan('member', 'project-1', true, false), false)
  assert.equal(canAccessProjectScan('member', 'project-1', true, true), true)
  assert.equal(canAccessProjectScan('owner', 'project-1', true, false), true)
})
