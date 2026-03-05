---
title: Quick Start
description: Get up and running with Minions Sequences in minutes
---

## TypeScript

```typescript
import { createClient } from '@minions-sequences/sdk';

const client = createClient();
console.log('Version:', client.version);
```

## Python

```python
from minions_sequences import create_client

client = create_client()
print(f"Version: {client['version']}")
```

## CLI

```bash
sequences info
```
