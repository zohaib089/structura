# Skill: Knowledge Manager

**Skill ID:** `knowledge-manager`  
**Version:** 1.0  
**Created:** Day 1

## Purpose
This skill allows AI Agents to work with the project Knowledge Base.

## What it can do
- Read any document from the Knowledge Base
- List all available documents
- Search inside the Knowledge Base
- Add new knowledge
- Update existing knowledge

## Inputs
- `action`: "read" | "list" | "search" | "add" | "update"
- `path` (optional): path of the document
- `query` (optional): search text
- `content` (optional): new content to add/update

## Outputs
- Success or error message
- Document content (when reading)
- List of documents (when listing)

## Example Usage by Agent
User asks: "What decisions have we made so far?"
→ Agent calls this skill with action = "list" and path = "decisions"