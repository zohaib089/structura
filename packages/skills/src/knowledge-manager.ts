/**
 * Skill: Knowledge Manager
 * This skill helps agents read and manage the Knowledge Base.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

const KNOWLEDGE_ROOT = path.join(process.cwd(), '../../knowledge')

export interface KnowledgeInput {
  action: 'read' | 'list' | 'search' | 'add' | 'update'
  path?: string
  query?: string
  content?: string
}

export interface KnowledgeOutput {
  success: boolean
  message: string
  data?: any
}

export async function knowledgeManager(input: KnowledgeInput): Promise<KnowledgeOutput> {
  try {
    switch (input.action) {
      case 'list': {
        const targetPath = input.path 
          ? path.join(KNOWLEDGE_ROOT, input.path)
          : KNOWLEDGE_ROOT

        const files = await fs.readdir(targetPath, { recursive: true })
        return {
          success: true,
          message: 'Documents listed successfully',
          data: files
        }
      }

      case 'read': {
        if (!input.path) {
          return { success: false, message: 'Path is required for read action' }
        }

        const fullPath = path.join(KNOWLEDGE_ROOT, input.path)
        const content = await fs.readFile(fullPath, 'utf-8')

        return {
          success: true,
          message: 'Document read successfully',
          data: content
        }
      }

      case 'add':
      case 'update': {
        if (!input.path || !input.content) {
          return { success: false, message: 'Path and content are required' }
        }

        const fullPath = path.join(KNOWLEDGE_ROOT, input.path)
        await fs.writeFile(fullPath, input.content, 'utf-8')

        return {
          success: true,
          message: `Document ${input.action}d successfully`
        }
      }

      default:
        return { success: false, message: 'Unknown action' }
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Something went wrong'
    }
  }
}