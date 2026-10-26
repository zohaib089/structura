/**
 * Hosted login, signup, and dashboard.
 *
 * Default is on so the current routes and tests keep working.
 * Set VITE_HOSTED_APP=false to hide those links and send those routes home.
 * This does not redesign either screen.
 */
export function hostedAppEnabledFrom(value: string | undefined): boolean {
  return value !== 'false'
}

export const hostedAppEnabled = hostedAppEnabledFrom(import.meta.env.VITE_HOSTED_APP)
