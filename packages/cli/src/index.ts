#!/usr/bin/env node

/**
 * @minions-sequences/cli — CLI for Minions Sequences
 *
 * Supports multiple storage backends via the MINIONS_BACKEND env var:
 *   - json (default): JsonFileStorageAdapter — sharded, atomic file storage
 *   - convex: ConvexStorageAdapter — Convex DB backend
 *   - supabase: SupabaseStorageAdapter — Supabase/Postgres backend
 *
 * Optionally supports an index layer via MINIONS_INDEX env var:
 *   - memory: MemoryIndexAdapter — in-process index
 *   - supabase: SupabaseIndexAdapter — Supabase-backed index
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
    createMinion,
    updateMinion,
    softDelete,
    generateId,
    TypeRegistry,
    Minions,
    MemoryStorageAdapter,
    ConvexStorageAdapter,
    SupabaseStorageAdapter,
    toIndexEntry,
    MemoryIndexAdapter,
} from 'minions-sdk';
import type { Minion, StorageFilter, StorageAdapter, IndexAdapter } from 'minions-sdk';
import { customTypes } from '@minions-sequences/sdk';

const program = new Command();
const STORE_DIR = process.env.MINIONS_STORE || '.minions';
const BACKEND = process.env.MINIONS_BACKEND || 'json';
const INDEX_BACKEND = process.env.MINIONS_INDEX || '';

// Register custom types
const registry = new TypeRegistry();
for (const t of customTypes) {
    registry.register(t);
}

// ─── Storage factory ───────────────────────────────────────
let _storage: StorageAdapter | null = null;
async function getStorage(): Promise<StorageAdapter> {
    if (_storage) return _storage;

    switch (BACKEND) {
        case 'convex': {
            // Requires CONVEX_URL env var and Convex function references
            // See minions-sdk docs for ConvexStorageAdapter setup
            const convexUrl = process.env.CONVEX_URL;
            if (!convexUrl) {
                console.error(chalk.red('CONVEX_URL env var is required for convex backend'));
                process.exit(1);
            }
            const { ConvexClient } = await import('convex/browser');
            const { api } = await import('../convex/_generated/api.js');
            const client = new ConvexClient(convexUrl);
            _storage = new ConvexStorageAdapter(client, {
                functions: { get: api.minions.get, list: api.minions.list, set: api.minions.set, delete: api.minions.remove },
            });
            break;
        }
        case 'supabase': {
            // Requires SUPABASE_URL and SUPABASE_ANON_KEY env vars
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseKey) {
                console.error(chalk.red('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required for supabase backend'));
                process.exit(1);
            }
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);
            _storage = new SupabaseStorageAdapter(supabase as any);
            break;
        }
        case 'memory':
            _storage = new MemoryStorageAdapter();
            break;
        case 'json':
        default: {
            const { JsonFileStorageAdapter } = await import('minions-sdk/node');
            _storage = await JsonFileStorageAdapter.create(STORE_DIR);
            break;
        }
    }
    return _storage;
}

// ─── Index factory (optional) ──────────────────────────────
let _index: IndexAdapter | null = null;
async function getIndex(): Promise<IndexAdapter | undefined> {
    if (_index) return _index;
    if (!INDEX_BACKEND) return undefined;

    switch (INDEX_BACKEND) {
        case 'memory':
            _index = new MemoryIndexAdapter();
            return _index;
        case 'supabase': {
            const { SupabaseIndexAdapter } = await import('minions-sdk');
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseKey) {
                console.error(chalk.red('SUPABASE_URL and SUPABASE_ANON_KEY env vars are required for supabase index'));
                process.exit(1);
            }
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);
            _index = new SupabaseIndexAdapter(supabase as any);
            return _index;
        }
        default:
            return undefined;
    }
}

function findType(slug: string) {
    const type = registry.getBySlug(slug);
    if (!type) {
        console.error(chalk.red(`Unknown type: ${slug}`));
        console.error(chalk.dim(`Available: ${customTypes.map(t => t.slug).join(', ')}`));
        process.exit(1);
    }
    return type;
}

program
    .name('sequences')
    .description('Multi-step email drip campaigns, cadence rules, A/B variants, and open/reply tracking')
    .version('0.1.0');

// ─── info ──────────────────────────────────────────────────
program
    .command('info')
    .description('Show project info')
    .action(() => {
        console.log(chalk.bold('Minions Sequences'));
        console.log(chalk.dim('Multi-step email drip campaigns, cadence rules, A/B variants, and open/reply tracking'));
        console.log('');
        console.log(`  SDK:      ${chalk.cyan('@minions-sequences/sdk')}`);
        console.log(`  CLI:      ${chalk.cyan('@minions-sequences/cli')}`);
        console.log(`  Python:   ${chalk.cyan('minions-sequences')}`);
        console.log(`  Backend:  ${chalk.cyan(BACKEND)}`);
        console.log(`  Index:    ${chalk.cyan(INDEX_BACKEND || 'none')}`);
        console.log(`  Store:    ${chalk.cyan(STORE_DIR)}`);
        console.log(`  Types:    ${chalk.cyan(String(customTypes.length))}`);
    });

// ─── types ─────────────────────────────────────────────────
const types = program.command('types').description('Manage MinionType schemas');

types
    .command('list')
    .alias('ls')
    .description('List all available MinionTypes')
    .action(() => {
        console.log(chalk.bold(`\n  ${customTypes.length} MinionTypes available:\n`));
        for (const type of customTypes) {
            const fieldCount = type.schema.length;
            console.log(`  ${type.icon}  ${chalk.bold(type.name)} ${chalk.dim(`(${type.slug})`)}`);
            console.log(`     ${chalk.dim(type.description || '')}`);
            console.log(`     ${chalk.dim(`${fieldCount} fields: ${type.schema.map(f => f.name).join(', ')}`)}`);
            console.log('');
        }
    });

types
    .command('show <slug>')
    .description('Show detailed schema for a MinionType')
    .action((slug: string) => {
        const type = findType(slug);
        console.log(`\n  ${type.icon}  ${chalk.bold(type.name)}`);
        console.log(`  ${chalk.dim(type.description || '')}`);
        console.log(`  ${chalk.dim(`ID: ${type.id}  Slug: ${type.slug}`)}\n`);
        console.log(chalk.bold('  Fields:\n'));
        for (const field of type.schema) {
            const typeColor = field.type === 'string' ? 'green' : field.type === 'number' ? 'yellow' : field.type === 'boolean' ? 'blue' : 'magenta';
            const req = field.required ? chalk.red('*') : ' ';
            console.log(`    ${req} ${chalk.bold(field.name)}  ${(chalk as any)[typeColor](field.type)}${field.description ? `  ${chalk.dim(field.description)}` : ''}`);
        }
        console.log('');
    });

// ─── create ────────────────────────────────────────────────
program
    .command('create <type>')
    .description('Create a new Minion of the specified type')
    .option('-d, --data <json>', 'Field data as JSON string')
    .option('-f, --file <path>', 'Read field data from a JSON file')
    .option('-t, --title <title>', 'Minion title')
    .option('-s, --status <status>', 'Status: active, todo, in_progress, completed, cancelled')
    .option('-p, --priority <priority>', 'Priority: low, medium, high, urgent')
    .option('--tags <tags>', 'Comma-separated tags')
    .action(async (typeSlug: string, opts: any) => {
        const type = findType(typeSlug);
        const storage = await getStorage();

        let fields: Record<string, unknown> = {};
        if (opts.file) {
            const { readFileSync } = await import('fs');
            fields = JSON.parse(readFileSync(opts.file, 'utf-8'));
        } else if (opts.data) {
            fields = JSON.parse(opts.data);
        }

        const title = opts.title || (fields as any).title || (fields as any).name || type.name;
        const tags = opts.tags ? opts.tags.split(',').map((t: string) => t.trim()) : undefined;

        const { minion } = createMinion({
            title,
            fields,
            status: opts.status || 'active',
            priority: opts.priority,
            tags,
            createdBy: 'cli',
        }, type);

        await storage.set(minion);

        // Update index if configured
        const index = await getIndex();
        if (index) await index.upsert(toIndexEntry(minion));

        console.log(chalk.green(`\n  ✔ Created ${type.icon} ${type.name}`));
        console.log(`  ${chalk.dim('ID:')}    ${minion.id}`);
        console.log(`  ${chalk.dim('Title:')} ${minion.title}`);
        console.log(`  ${chalk.dim('Path:')}  ${STORE_DIR}/${minion.id.replace(/-/g, '').slice(0, 2)}/${minion.id.replace(/-/g, '').slice(2, 4)}/${minion.id}.json`);
        console.log('');
    });

// ─── list ──────────────────────────────────────────────────
program
    .command('list [type]')
    .alias('ls')
    .description('List all Minions, optionally filtered by type')
    .option('--status <status>', 'Filter by status')
    .option('--json', 'Output as JSON')
    .option('-n, --limit <n>', 'Max results', parseInt)
    .action(async (typeSlug: string | undefined, opts: any) => {
        const storage = await getStorage();
        const filter: StorageFilter = {};
        if (typeSlug) {
            const type = findType(typeSlug);
            filter.minionTypeId = type.id;
        }
        if (opts.status) filter.status = opts.status;
        if (opts.limit) filter.limit = opts.limit;

        const minions = await storage.list(filter);

        if (opts.json) { console.log(JSON.stringify(minions, null, 2)); return; }
        if (minions.length === 0) { console.log(chalk.dim('\n  No Minions found.\n')); return; }

        console.log(chalk.bold(`\n  ${minions.length} Minion(s):\n`));
        for (const m of minions) {
            const type = registry.getById(m.minionTypeId);
            const icon = type?.icon || '?';
            const status = m.status ? chalk.dim(`[${m.status}]`) : '';
            console.log(`  ${icon}  ${chalk.bold(m.title)} ${status}`);
            console.log(`     ${chalk.dim(m.id)} ${chalk.dim(type?.slug || m.minionTypeId)}`);
        }
        console.log('');
    });

// ─── show ──────────────────────────────────────────────────
program
    .command('show <id>')
    .description('Show a Minion by ID')
    .option('--json', 'Output as JSON')
    .action(async (id: string, opts: any) => {
        const storage = await getStorage();
        const minion = await storage.get(id);

        if (!minion) {
            console.error(chalk.red(`\n  Minion not found: ${id}\n`));
            process.exit(1);
        }

        if (opts.json) { console.log(JSON.stringify(minion, null, 2)); return; }

        const type = registry.getById(minion.minionTypeId);
        console.log(`\n  ${type?.icon || '?'}  ${chalk.bold(minion.title)}`);
        console.log(`  ${chalk.dim(`Type: ${type?.slug || minion.minionTypeId}  ID: ${minion.id}`)}`);
        console.log(`  ${chalk.dim(`Status: ${minion.status || '-'}  Priority: ${minion.priority || '-'}`)}`);
        console.log(`  ${chalk.dim(`Created: ${minion.createdAt}  Updated: ${minion.updatedAt}`)}`);
        if (minion.tags?.length) console.log(`  ${chalk.dim(`Tags: ${minion.tags.join(', ')}`)}`);
        console.log(chalk.bold('\n  Fields:\n'));
        for (const [key, value] of Object.entries(minion.fields || {})) {
            console.log(`    ${chalk.dim('•')} ${chalk.bold(key)}: ${value}`);
        }
        console.log('');
    });

// ─── update ────────────────────────────────────────────────
program
    .command('update <id>')
    .description('Update fields on an existing Minion')
    .option('-d, --data <json>', 'Fields to update as JSON')
    .option('-s, --status <status>', 'Update status')
    .option('-p, --priority <priority>', 'Update priority')
    .option('-t, --title <title>', 'Update title')
    .option('--tags <tags>', 'Replace tags (comma-separated)')
    .action(async (id: string, opts: any) => {
        const storage = await getStorage();
        const existing = await storage.get(id);
        if (!existing) {
            console.error(chalk.red(`\n  Minion not found: ${id}\n`));
            process.exit(1);
        }

        const updates: any = {};
        if (opts.data) updates.fields = { ...existing.fields, ...JSON.parse(opts.data) };
        if (opts.status) updates.status = opts.status;
        if (opts.priority) updates.priority = opts.priority;
        if (opts.title) updates.title = opts.title;
        if (opts.tags) updates.tags = opts.tags.split(',').map((t: string) => t.trim());

        const type = registry.getById(existing.minionTypeId);
        const { minion: updated } = updateMinion(existing, { ...updates, updatedBy: 'cli' }, type!);
        await storage.set(updated);

        // Update index if configured
        const index = await getIndex();
        if (index) await index.upsert(toIndexEntry(updated));

        console.log(chalk.green(`\n  ✔ Updated ${type?.icon || '?'} ${updated.title}`));
        for (const [key, value] of Object.entries(updates)) {
            if (key === 'fields') {
                for (const [fk, fv] of Object.entries(value as any)) {
                    console.log(`    ${chalk.dim('•')} fields.${fk} → ${fv}`);
                }
            } else {
                console.log(`    ${chalk.dim('•')} ${key} → ${value}`);
            }
        }
        console.log('');
    });

// ─── delete ────────────────────────────────────────────────
program
    .command('delete <id>')
    .description('Soft-delete a Minion (set deletedAt timestamp)')
    .option('--hard', 'Permanently remove the file from disk')
    .action(async (id: string, opts: any) => {
        const storage = await getStorage();
        const existing = await storage.get(id);
        if (!existing) {
            console.error(chalk.red(`\n  Minion not found: ${id}\n`));
            process.exit(1);
        }

        const index = await getIndex();

        if (opts.hard) {
            await storage.delete(id);
            if (index) await index.remove(id);
            console.log(chalk.yellow(`\n  🗑  Permanently deleted ${id}\n`));
        } else {
            const deleted = softDelete(existing, 'cli');
            await storage.set(deleted);
            if (index) await index.upsert(toIndexEntry(deleted));
            console.log(chalk.yellow(`\n  ✔ Soft-deleted ${existing.title}`));
            console.log(chalk.dim(`    Use --hard to permanently remove\n`));
        }
    });

// ─── search ────────────────────────────────────────────────
program
    .command('search <query>')
    .description('Full-text search across all Minions')
    .option('--json', 'Output as JSON')
    .action(async (query: string, opts: any) => {
        const storage = await getStorage();
        const results = await storage.search(query);

        if (opts.json) { console.log(JSON.stringify(results, null, 2)); return; }
        if (results.length === 0) { console.log(chalk.dim(`\n  No results for "${query}".\n`)); return; }

        console.log(chalk.bold(`\n  ${results.length} result(s) for "${query}":\n`));
        for (const m of results) {
            const type = registry.getById(m.minionTypeId);
            const icon = type?.icon || '?';
            const status = m.status ? chalk.dim(`[${m.status}]`) : '';
            console.log(`  ${icon}  ${chalk.bold(m.title)} ${status}`);
            console.log(`     ${chalk.dim(m.id)} ${chalk.dim(type?.slug || m.minionTypeId)}`);
        }
        console.log('');
    });

// ─── validate ──────────────────────────────────────────────
program
    .command('validate <file>')
    .description('Validate a JSON file against its MinionType schema')
    .action(async (file: string) => {
        const { readFileSync } = await import('fs');
        const { validateFields } = await import('minions-sdk');
        const data = JSON.parse(readFileSync(file, 'utf-8')) as Minion;
        const type = registry.getById(data.minionTypeId);

        if (!type) {
            console.error(chalk.red(`\n  Unknown type: ${data.minionTypeId}\n`));
            process.exit(1);
        }

        const result = validateFields(data.fields, type.schema);
        if (result.valid) {
            console.log(chalk.green(`\n  ✔ Valid ${type.icon} ${type.name}\n`));
        } else {
            console.log(chalk.red(`\n  ✘ ${result.errors.length} validation error(s):\n`));
            for (const err of result.errors) {
                console.log(`    ${chalk.red('•')} ${err.field}: ${err.message}`);
            }
            console.log('');
            process.exit(1);
        }
    });

// ─── stats ─────────────────────────────────────────────────
program
    .command('stats')
    .description('Show statistics about stored Minions')
    .action(async () => {
        const storage = await getStorage();
        console.log(chalk.bold('\n  Minion Statistics:\n'));

        let total = 0;
        for (const type of customTypes) {
            const minions = await storage.list({ minionTypeId: type.id });
            const count = minions.length;
            total += count;
            const bar = chalk.cyan('█'.repeat(Math.min(count, 30)));
            console.log(`  ${type.icon}  ${(type.name || '').padEnd(22)} ${String(count).padStart(4)}  ${count > 0 ? bar : chalk.dim('0')}`);
        }
        console.log(`\n  ${chalk.bold('Total:')} ${total} Minion(s)`);
        console.log(`  ${chalk.dim(`Store: ${STORE_DIR}`)}\n`);
    });

program.parse();
