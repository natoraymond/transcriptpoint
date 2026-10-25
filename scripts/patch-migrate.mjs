import { readFileSync, writeFileSync } from "node:fs";

let content = readFileSync("scripts/migrate-neon.mjs", "utf8");
const target = `: ["Lagos", "Federal Capital Territory (Abuja)"].includes(stateName)
        ? 3000000
        : null;`;

const replacement = `: ["Lagos", "Federal Capital Territory (Abuja)"].includes(stateName)
        ? 3000000
        : ["Anambra", "Imo", "Delta", "Ebonyi", "Abia", "Enugu", "Rivers", "Rivers (Port Harcourt)", "Port Harcourt (Rivers)"].includes(stateName)
          ? 2450000
          : null;`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  writeFileSync("scripts/migrate-neon.mjs", content, "utf8");
  console.log("migrate-neon.mjs successfully updated");
} else {
  // Try CRLF
  const targetCRLF = target.replace(/\n/g, "\r\n");
  const replacementCRLF = replacement.replace(/\n/g, "\r\n");
  if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replacementCRLF);
    writeFileSync("scripts/migrate-neon.mjs", content, "utf8");
    console.log("migrate-neon.mjs successfully updated (CRLF)");
  } else {
    console.log("target not found in migrate-neon.mjs");
  }
}
