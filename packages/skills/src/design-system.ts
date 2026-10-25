/**
 * Skill: Structura Design System
 * Shared visual-system guidance for Structura web UI work.
 */

export interface DesignSystemInput {
  task: 'create' | 'modify' | 'review'
  surface?: 'component' | 'screen' | 'theme' | 'responsive'
}

export interface DesignSystemOutput {
  success: boolean
  message: string
  guidance: string[]
}

export function designSystem(input: DesignSystemInput): DesignSystemOutput {
  const guidance = [
    'Read the Structura Design System standard and inspect neighboring UI before making changes.',
    'Use shared semantic design tokens and existing components; do not introduce local raw design values.',
    'Add missing design values to the central token system before using them, including light and dark theme behavior.',
    'Preserve the established navy, cyan, and violet product direction and its coordinated light theme.',
    'Check responsive layout, semantic markup, keyboard operation, visible focus, and relevant interaction states.',
    'Verify text and control contrast in both themes, avoid color-only status, and respect reduced motion.',
    'Report design-system violations during review and run relevant project checks.'
  ]

  if (input.surface === 'theme') {
    guidance.push('Keep semantic color roles consistent and verify theme switching does not change the meaning of a token.')
  }

  if (input.surface === 'responsive') {
    guidance.push('Use the shared content width and spacing scale; validate narrow layouts without horizontal overflow.')
  }

  if (input.task === 'review') {
    guidance.push('Treat undocumented one-off design values as violations unless there is a clear product reason.')
  }

  return {
    success: true,
    message: 'Design system guidance prepared successfully',
    guidance
  }
}
