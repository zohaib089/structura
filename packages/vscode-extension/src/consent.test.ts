import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureScanConsent, grantConsent, type ConsentStore, type ConsentValue } from './consent.js'
import { copy, messages } from './messages.js'

function memoryStore(initial: Record<string, ConsentValue> = {}): ConsentStore & { data: Record<string, ConsentValue> } {
  const data = { ...initial }
  return {
    data,
    get: (key) => data[key],
    set: (key, value) => {
      data[key] = value
    }
  }
}

test('ensureScanConsent returns a stored grant without prompting', async () => {
  const store = memoryStore({ ws: 'granted' })
  let prompted = 0
  const result = await ensureScanConsent(store, 'ws', {
    showInformationMessage: async () => {
      prompted += 1
      return messages.scanAction
    }
  })
  assert.equal(result, 'granted')
  assert.equal(prompted, 0)
})

test('ensureScanConsent returns a stored decline without prompting', async () => {
  const store = memoryStore({ ws: 'declined' })
  let prompted = 0
  const result = await ensureScanConsent(store, 'ws', {
    showInformationMessage: async () => {
      prompted += 1
      return undefined
    }
  })
  assert.equal(result, 'declined')
  assert.equal(prompted, 0)
})

test('Scan on the modal grants consent and uses the required wording', async () => {
  const store = memoryStore()
  const result = await ensureScanConsent(store, 'ws', {
    showInformationMessage: async (message, options, ...items) => {
      assert.equal(message, copy('scanConsent'))
      assert.equal(message.includes('Atlasmith'), true)
      assert.equal(message.includes('this computer'), true)
      assert.equal((options as { modal?: boolean }).modal, true)
      assert.deepEqual(items, [messages.scanAction, messages.notNowAction])
      return messages.scanAction
    }
  })
  assert.equal(result, 'granted')
  assert.equal(store.get('ws'), 'granted')
})

test('Not now is remembered as declined', async () => {
  const store = memoryStore()
  const result = await ensureScanConsent(store, 'ws', {
    showInformationMessage: async () => messages.notNowAction
  })
  assert.equal(result, 'declined')
  assert.equal(store.get('ws'), 'declined')
})

test('dismissing the modal does not persist a decision', async () => {
  const store = memoryStore()
  const result = await ensureScanConsent(store, 'ws', {
    showInformationMessage: async () => undefined
  })
  assert.equal(result, 'dismissed')
  assert.equal(store.get('ws'), undefined)
})

test('grantConsent records an explicit webview Scan click', async () => {
  const store = memoryStore({ ws: 'declined' })
  await grantConsent(store, 'ws')
  assert.equal(store.get('ws'), 'granted')
})
