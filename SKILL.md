---
name: search-tools-instructions
description: Instructions for MCP code search tools. Use when you need to find files, text, regex matches, or symbols in the codebase (search/find/grep/where-is queries).
allowed-tools: execute_tool
---

# MCP Search Tools Reference

Use MCP search tools for code discovery instead of shell pipelines (`find`, `grep -R`, regex `grep`).

## Purpose

Describe what each search tool does, when to pick it, and how to replace common terminal search commands.

## Tool Capabilities

Use universal `execute_tool` to call branch `skill_search`:

- `execute_tool(command="skill_search --mode file --q ... --limit ...")`
- `execute_tool(command="skill_search --mode text --q ... --limit ...")`
- `execute_tool(command="skill_search --mode regex --q ... --limit ...")`
- `execute_tool(command="skill_search --mode symbol --q ... --limit ...")`

## Use Instead of Terminal

- `find . -name "*.java"` -> `execute_tool(command="skill_search --mode file --q ...")`
- `grep -R "@Cacheable" src` -> `execute_tool(command="skill_search --mode text --q ...")`
- `grep -R -E "Mapper|DTO|Entity" src` -> `execute_tool(command="skill_search --mode regex --q ...")`
- Symbol hunt (`class Foo`, `method bar`) -> `execute_tool(command="skill_search --mode symbol --q ...")`

## Minimal Examples

```json
{"tool":"execute_tool","arguments":{"command":"skill_search --mode file --q '**/*Controller*.java' --limit 25"}}
```

```json
{"tool":"execute_tool","arguments":{"command":"skill_search --mode text --q '@Cacheable' --limit 25"}}
```

```json
{"tool":"execute_tool","arguments":{"command":"skill_search --mode regex --q 'Mapper|DTO|Entity' --limit 25"}}
```

```json
{"tool":"execute_tool","arguments":{"command":"skill_search --mode symbol --q 'OrderService' --limit 25"}}
```

## Short Rules

- Start with one focused call first.
- Do not retry the same call (`tool + q`) without refinement.
- Refine `q` before widening scope or increasing `limit`.
