import { readFileSync, writeFileSync } from "node:fs";

let content = readFileSync("db/schema.sql", "utf8");
const target = "WHEN state_name IN ('Lagos', 'Federal Capital Territory (Abuja)') THEN 3000000";
const replacement = "WHEN state_name IN ('Lagos', 'Federal Capital Territory (Abuja)') THEN 3000000\r\n      WHEN state_name IN ('Anambra', 'Imo', 'Delta', 'Ebonyi', 'Abia', 'Enugu', 'Rivers', 'Rivers (Port Harcourt)', 'Port Harcourt (Rivers)') THEN 2450000";

if (content.includes(target)) {
  content = content.replace(target, replacement);
  writeFileSync("db/schema.sql", content, "utf8");
  console.log("schema.sql successfully updated");
} else {
  console.log("target not found in schema.sql");
}
