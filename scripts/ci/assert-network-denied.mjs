#!/usr/bin/env node
/**
 * Proves the current network namespace cannot open a TCP connection.
 * Must be run under scripts/ci/with-netns.sh. A successful connect fails the job.
 */
import net from 'node:net'

const host = '1.1.1.1'
const port = 443
const allowed = new Set([
  'ENETUNREACH',
  'EHOSTUNREACH',
  'ENETDOWN',
  'EHOSTDOWN',
  'EADDRNOTAVAIL',
  'ENONET'
])

const socket = net.connect({ host, port })
const timer = setTimeout(() => {
  socket.destroy()
  console.error(`network self-test failed: connect to ${host}:${port} timed out without ENETUNREACH or similar`)
  process.exit(1)
}, 5000)

socket.on('connect', () => {
  clearTimeout(timer)
  socket.destroy()
  console.error(`network self-test failed: connected to ${host}:${port}`)
  process.exit(1)
})

socket.on('error', (error) => {
  clearTimeout(timer)
  const code = error && error.code
  if (allowed.has(code)) {
    console.log(`network self-test passed: ${code} ${error.message}`)
    process.exit(0)
  }
  console.error(`network self-test failed: unexpected ${code ?? 'error'} ${error.message}`)
  process.exit(1)
})
