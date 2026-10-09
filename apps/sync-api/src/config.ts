export function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value; }
export function databaseConfig() {
  const url = required('TURSO_DATABASE_URL');
  if (!url.startsWith('libsql://') && !url.startsWith('https://')) throw new Error('Remote sync database requires TLS');
  return {url,authToken:required('TURSO_AUTH_TOKEN')};
}
