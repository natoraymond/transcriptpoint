import { readFileSync, existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { Country, State as StateData } from "country-state-city";
import worldCountries from "world-countries";

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  for (const fileName of [".env.local", ".env"]) {
    if (!existsSync(fileName)) {
      continue;
    }

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
const statements = readFileSync("db/schema.sql", "utf8")
  .split(/;\s*(?:\r?\n|$)/)
  .map((statement) => statement.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

const destinations = [];
for (const country of Country.getAllCountries()) {
  const metadata = worldCountries.find(({ cca2 }) => cca2 === country.isoCode);
  if (!metadata) continue;

  let continent;
  if (metadata.region === "Americas") {
    continent = metadata.subregion === "South America" ? "South America" : "North America";
  } else if (metadata.region === "Africa") {
    continent = "African";
  } else if (metadata.region === "Oceania") {
    continent = country.isoCode === "AU" ? "Australia" : "Oceania";
  } else if (metadata.region === "Antarctic") {
    continent = "Antarctica";
  } else if (["Asia", "Europe"].includes(metadata.region)) {
    continent = metadata.region;
  }
  if (!continent) continue;

  const states = StateData.getStatesOfCountry(country.isoCode);
  const stateNames = states.length > 0
    ? [...new Set(states.map(({ name }) => (
      country.isoCode === "NG" && name === "Abuja Federal Capital Territory"
        ? "Federal Capital Territory (Abuja)"
        : name
    )))]
    : [`All of ${country.name}`];
  for (const stateName of stateNames) {
    destinations.push([continent, country.isoCode, country.name, stateName]);
  }
}

for (let offset = 0; offset < destinations.length; offset += 100) {
  const batch = destinations.slice(offset, offset + 100);
  const parameters = batch.flat();
  const values = batch.map((_, index) => {
    const parameter = index * 4;
    return `($${parameter + 1}, $${parameter + 2}, $${parameter + 3}, $${parameter + 4}, NULL)`;
  });
  await sql.query(
    `INSERT INTO dhl_delivery_rates (continent, country_code, country_name, state_name, price_kobo)
     VALUES ${values.join(", ")}
     ON CONFLICT (country_code, state_name) DO UPDATE
     SET continent = EXCLUDED.continent, country_name = EXCLUDED.country_name, updated_at = NOW()`,
    parameters,
  );
}

await sql.query(
  "DELETE FROM dhl_delivery_rates WHERE country_code = 'NG' AND state_name = 'Abuja Federal Capital Territory' AND EXISTS (SELECT 1 FROM dhl_delivery_rates WHERE country_code = 'NG' AND state_name = 'Federal Capital Territory (Abuja)')",
);

const [{ table_name: tableName }] = await sql.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_requests'",
);
const [{ rateCount }] = await sql.query(
  "SELECT COUNT(*)::int AS \"rateCount\" FROM dhl_delivery_rates",
);
const rates = await sql.query(
  "SELECT state_name AS \"stateName\", price_kobo AS \"priceKobo\" FROM dhl_delivery_rates WHERE country_code = 'NG' AND state_name IN ('Lagos', 'Enugu', 'Federal Capital Territory (Abuja)') ORDER BY state_name",
);

console.log(`Verified Neon table: ${tableName}`);
console.log(`Verified DHL destinations and states: ${rateCount}`);
console.log(`Loaded DHL destination catalog rows: ${destinations.length}`);
console.log(
  rates.map(({ stateName, priceKobo }) => `${stateName}: N${(priceKobo / 100).toLocaleString("en-NG")}`).join(", "),
);