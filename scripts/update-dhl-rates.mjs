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

async function updateDhlRates() {
  const targetStates = [
    "Anambra",
    "Imo",
    "Delta",
    "Ebonyi",
    "Abia",
    "Enugu",
    "Rivers",
    "Rivers (Port Harcourt)"
  ];
  const priceKobo = 2450000; // N24,500.00 in kobo

  console.log("Updating DHL rates to N24,500 (2,450,000 kobo)...");

  // 1. Ensure Rivers (Port Harcourt) exists as an alias or option if requested by user
  await sql`
    INSERT INTO dhl_delivery_rates (continent, country_code, country_name, state_name, price_kobo)
    VALUES ('African', 'NG', 'Nigeria', 'Rivers (Port Harcourt)', ${priceKobo})
    ON CONFLICT (country_code, state_name) DO UPDATE
    SET price_kobo = ${priceKobo}, updated_at = NOW()
  `;

  // 2. Also ensure Port Harcourt alone exists if users look specifically for Port Harcourt
  await sql`
    INSERT INTO dhl_delivery_rates (continent, country_code, country_name, state_name, price_kobo)
    VALUES ('African', 'NG', 'Nigeria', 'Port Harcourt (Rivers)', ${priceKobo})
    ON CONFLICT (country_code, state_name) DO UPDATE
    SET price_kobo = ${priceKobo}, updated_at = NOW()
  `;

  // 3. Update the primary Nigerian states: Anambra, Imo, Delta, Ebonyi, Abia, Enugu, Rivers
  const updated = await sql`
    UPDATE dhl_delivery_rates
    SET price_kobo = ${priceKobo},
        updated_at = NOW()
    WHERE country_code = 'NG'
      AND state_name IN (
        'Anambra',
        'Imo',
        'Delta',
        'Ebonyi',
        'Abia',
        'Enugu',
        'Rivers',
        'Rivers (Port Harcourt)',
        'Port Harcourt (Rivers)'
      )
    RETURNING state_name, price_kobo
  `;

  console.log("Successfully updated rows in database:");
  for (const row of updated) {
    console.log(` - ${row.state_name}: N${(row.price_kobo / 100).toLocaleString("en-NG")} (${row.price_kobo} kobo)`);
  }
}

updateDhlRates().catch(console.error);
