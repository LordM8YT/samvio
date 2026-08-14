import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL mangler.');
const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, multipleStatements: true });
try {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) NOT NULL PRIMARY KEY,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  const files = (await readdir(new URL('../database/', import.meta.url))).filter((file) => file.endsWith('.sql')).sort();
  for (const filename of files) {
    const raw = await readFile(new URL(`../database/${filename}`, import.meta.url), 'utf8');
    const sql = raw.replace(/^CREATE DATABASE[^;]+;\s*/im, '').replace(/^USE\s+[^;]+;\s*/im, '');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const [rows] = await connection.query('SELECT checksum FROM schema_migrations WHERE filename = ?', [filename]);
    if (rows.length) {
      if (rows[0].checksum !== checksum) throw new Error(`Migrasjonen ${filename} er endret etter kjøring.`);
      continue;
    }
    await connection.query(sql);
    await connection.query('INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)', [filename, checksum]);
    console.log(`Kjørte ${filename}`);
  }
} finally {
  await connection.end();
}
