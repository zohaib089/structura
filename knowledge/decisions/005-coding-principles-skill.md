# Decision 005: Shared Coding Principles Skill

Date: Day 2  
Project: Structura

We added a shared coding-principles guide and skill for repository-wide implementation and review work.

## Why

- Auth UI guidance covers a focused domain, not general code changes.
- Agents need consistent guidance for scope, type safety, error handling, tests, and validation.
- A shared baseline reduces avoidable regressions while allowing domain-specific standards.

## Locations

- Standards: `knowledge/coding-standards/general-principles.md`
- Skill documentation: `knowledge/skills/coding-principles.md`
- Skill implementation: `packages/skills/src/coding-principles.ts`
