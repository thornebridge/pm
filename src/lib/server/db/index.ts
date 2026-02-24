import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';
import { env } from '$env/dynamic/private';

const connectionString = env.DATABASE_URL || 'postgres://pm:pm@localhost:5432/pm';
const client = postgres(connectionString, { max: 20 });

export const db = drizzle(client, { schema });
