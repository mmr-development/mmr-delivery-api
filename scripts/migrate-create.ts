const fs = require('fs');
const path = require('path');

const migrationName = process.argv[2];

if (!migrationName) {
    console.error('A migration name must be provided');
    process.exit(1);
}

const date = new Date();
const timestamp = `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}_${String(date.getMinutes()).padStart(2, '0')}_${String(date.getSeconds()).padStart(2, '0')}`;

const filename = `${timestamp}_${migrationName}.ts`;

const content = `
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {

}

export async function down(db: Kysely<any>): Promise<void> {

}
`;

const migrationsDir = path.resolve(__dirname, '..', 'migrations');

fs.writeFileSync(path.join(migrationsDir, filename), content.trim() + '\n');

console.log(`Created new migration: ${path.join(migrationsDir, filename)}`);
