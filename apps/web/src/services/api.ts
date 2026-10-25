export async function checkBackend() {
  try {
    const response = await fetch('/health')
    if (!response.ok) {
      throw new Error(`Backend health check failed with status ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Backend is not running', error)
    return null
  }
}