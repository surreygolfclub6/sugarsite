// Loads UK populated places from GeoNames (CC BY 4.0) into uk_places.
// Usage: node scripts/import-places.mjs   (needs .env.local and `unzip`, `curl`)
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());
const base = "https://download.geonames.org/export/dump";
const dir = mkdtempSync(join(tmpdir(), "geonames-"));
for (const f of ["GB.zip", "admin2Codes.txt"]) execSync(`curl -sSf -o ${f} ${base}/${f}`, { cwd: dir });
execSync("unzip -oq GB.zip GB.txt", { cwd: dir });

const counties = new Map(
  readFileSync(join(dir, "admin2Codes.txt"), "utf8")
    .split("\n")
    .filter((l) => l.startsWith("GB."))
    .map((l) => l.split("\t"))
    .map(([code, name]) => [code, name]),
);
const nations = { ENG: "England", SCT: "Scotland", WLS: "Wales", NIR: "Northern Ireland" };
// Skip historical, abandoned, destroyed and "capital of a historic" entries.
const skip = new Set(["PPLH", "PPLQ", "PPLW", "PPLCH"]);

const rows = readFileSync(join(dir, "GB.txt"), "utf8")
  .split("\n")
  .map((l) => l.split("\t"))
  .filter((c) => c[6] === "P" && nations[c[10]] && !skip.has(c[7]))
  .map((c) => ({
    id: Number(c[0]),
    name: c[1],
    ascii_name: c[2],
    county: counties.get(`GB.${c[10]}.${c[11]}`) ?? null,
    nation: nations[c[10]],
    population: Number(c[14]) || 0,
    location: `SRID=4326;POINT(${c[5]} ${c[4]})`,
  }));

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
for (let i = 0; i < rows.length; i += 1000) {
  const { error } = await supabase.from("uk_places").upsert(rows.slice(i, i + 1000));
  if (error) throw error;
  process.stdout.write(`\r${Math.min(i + 1000, rows.length)} / ${rows.length}`);
}
console.log("\nDone.");
