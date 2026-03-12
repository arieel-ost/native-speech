#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const messagesDir = path.join(__dirname, "..", "src", "messages");
const sourceFile = "en.json";
const localeFiles = ["ru.json", "es.json", "fr.json"];

function getKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null
      ? getKeys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );
}

const source = JSON.parse(
  fs.readFileSync(path.join(messagesDir, sourceFile), "utf-8")
);
const sourceKeys = new Set(getKeys(source));

let hasErrors = false;
let hasWarnings = false;

for (const file of localeFiles) {
  const filePath = path.join(messagesDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: ${file} does not exist`);
    hasErrors = true;
    continue;
  }

  const locale = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const localeKeys = new Set(getKeys(locale));

  const missing = [...sourceKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !sourceKeys.has(k));

  if (missing.length > 0) {
    console.error(`ERROR: ${file} is missing ${missing.length} keys:`);
    missing.forEach((k) => console.error(`  - ${k}`));
    hasErrors = true;
  }

  if (extra.length > 0) {
    console.warn(`WARNING: ${file} has ${extra.length} extra keys:`);
    extra.forEach((k) => console.warn(`  + ${k}`));
    hasWarnings = true;
  }

  if (missing.length === 0 && extra.length === 0) {
    console.log(`OK: ${file} — all keys match`);
  }
}

if (hasErrors) {
  process.exit(1);
} else if (hasWarnings) {
  console.log("\nPassed with warnings.");
  process.exit(0);
} else {
  console.log("\nAll locale files are in sync.");
  process.exit(0);
}
