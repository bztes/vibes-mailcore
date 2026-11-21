import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';
import { APP_DATABASE_URL } from '$app/env/private';

const client = postgres(APP_DATABASE_URL!, { onnotice: () => {} });

export const db = drizzle(client, { schema });

/** Apply pending migrations from ./drizzle. Runs once on server start. */
export async function runMigrations() {
	await migrate(db, { migrationsFolder: 'drizzle' });
}
