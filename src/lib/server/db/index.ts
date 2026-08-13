import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({ uri: env.DATABASE_URL ?? 'mysql://invalid:invalid@127.0.0.1:3306/samvio', connectionLimit: 5, enableKeepAlive: true });
export const db = drizzle({ client: pool });
