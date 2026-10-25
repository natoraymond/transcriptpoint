import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const fileName of [".env.local", ".env"]) {
    if (!existsSync(fileName)) continue;
    const line = readFileSync(fileName, "utf8")
      .split(/\r?\n/)
      .find((entry) => entry.startsWith("DATABASE_URL="));
    if (line) {
      return line.slice("DATABASE_URL=".length).trim().replace(/^"|"$/g, "");
    }
  }
  throw new Error("DATABASE_URL is not configured");
}

const sql = neon(loadDatabaseUrl());

async function run() {
  const allNg = await sql`
    SELECT id, state_name, price_kobo 
    FROM dhl_delivery_rates 
    WHERE country_code = 'NG' 
    ORDER BY state_name
  `;
  console.log("Current NG states:", allNg.length);
  for (const row of allNg) {
    console.log(` - ${row.state_name}: ${row.price_kobo}`);
  }
}

run().catch(console.error);
