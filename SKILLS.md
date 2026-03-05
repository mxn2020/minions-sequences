---
name: minions-sequences
id: OC-0100
version: 1.0.0
description: "Agent skills for working with Minions Sequences MinionTypes. Provides CRUD operations, CLI usage, and best practices for AI agents managing minions-sequences data."
category: ai
subcategory: general
tags: ["minion", "ai", "general"]
comments:
---

# Minions Sequences Agent Skills

Skills for agents operating on the `minions-sequences` toolbox.

## Prerequisites

Install the SDK and CLI:

```bash
# TypeScript
pnpm add @minions-sequences/sdk

# Python
pip install minions-sequences

# CLI
pnpm add -g @minions-sequences/cli
```

---

## Using the CLI

The `sequences` CLI provides basic project info and utilities:

```bash
# Show project info (SDK name, CLI name, Python package)
sequences info
```

Use the CLI as the primary interface for scripted operations. For programmatic access within agent code, use the SDK directly.

---

## Using the SDK

### TypeScript

```ts
import { customTypes } from '@minions-sequences/sdk/schemas';

// List all available MinionTypes in this toolbox
for (const type of customTypes) {
  console.log(`${type.icon} ${type.name} (${type.slug})`);
  console.log(`  ${type.description}`);
  console.log(`  Fields: ${type.schema.map(f => f.name).join(', ')}`);
}

// Access a specific type
const myType = customTypes.find(t => t.slug === 'YOUR_TYPE_SLUG');
```

### Python

```python
from minions_sequences.schemas import custom_types

# List all available MinionTypes
for t in custom_types:
    print(f"{t.icon} {t.name} ({t.slug})")
    print(f"  {t.description}")
```

---

## Skill: Create Minion

When creating a new Minion of any type in this toolbox:

1. Look up the MinionType from `customTypes` by slug
2. Validate all required fields are present according to the schema
3. Set `string` fields to their values, `number` fields to numeric values
4. Set `select` fields to one of their valid options
5. Set `boolean` fields to `true` or `false`
6. Always include a timestamp for any `createdAt` or similar fields (ISO 8601 format)

---

## Skill: Read / Query Minions

When reading or searching for Minions:

1. Query by MinionType slug to filter by type
2. Use field values for secondary filtering
3. For references (fields ending in `Id`), resolve the linked Minion for full context
4. Return results in a structured format the calling agent can parse

---

## Skill: Update Minion

When updating an existing Minion:

1. Load the current Minion by ID
2. Validate the update against the MinionType schema
3. Only modify the fields that need changing — preserve existing values
4. If the type has a `status` field, follow valid status transitions
5. If the type has an `updatedAt` field, set it to the current timestamp
6. Log significant field changes for audit if the context requires it

---

## Skill: Delete / Archive Minion

When removing a Minion:

1. Prefer soft-delete: set `status` to `"cancelled"` or `"archived"` if available
2. Never hard-delete Minions that other Minions reference via ID fields
3. Check for dependent Minions before any destructive operation
4. If hard-delete is required, ensure all references are cleaned up first

---

## Hard Rules

- Every Minion MUST conform to its MinionType schema
- All `select` fields must use valid option values
- All ID reference fields must point to existing Minions
- Timestamps must be in ISO 8601 format
- Never create orphaned Minions — always set reference fields when applicable
- This agent only writes to `minions-sequences` — it reads from other toolboxes but never writes to them