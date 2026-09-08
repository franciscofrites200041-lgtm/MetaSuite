import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está seteada');
}

export const sql = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
});

export async function health() {
  const [row] = await sql`SELECT 1 AS ok`;
  return row?.ok === 1;
}
