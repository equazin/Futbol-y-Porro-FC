import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PANEL_FYP_DATA = path.resolve(PROJECT_ROOT, "..", "panel-fyp", "data.js");
const ENV_PATH = path.resolve(PROJECT_ROOT, ".env");

function parseEnv(raw) {
  const lines = raw.split(/\r?\n/);
  const out = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseLegacyData(raw) {
  const factory = new Function(`${raw}\nreturn { TOTAL_MATCHES, FONDO_COMUN, PLAYERS, MATCH_HISTORY };`);
  return factory();
}

function normalizeName(name) {
  if (!name) return name;
  return name
    .replace("IsleÃ±o", "Isleno")
    .replace("aÃ±", "an")
    .trim();
}

function parseScores(rawResult) {
  const nums = (rawResult.match(/\d+/g) ?? []).map((n) => Number(n));
  const a = Number.isFinite(nums[0]) ? nums[0] : 0;
  const b = Number.isFinite(nums[1]) ? nums[1] : 0;
  return { a, b };
}

function ymdToIso(dateYmd) {
  return `${dateYmd}T15:00:00.000Z`;
}

async function main() {
  const envRaw = await fs.readFile(ENV_PATH, "utf8");
  const env = parseEnv(envRaw);
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env");
  }

  const legacyRaw = await fs.readFile(PANEL_FYP_DATA, "utf8");
  const legacy = parseLegacyData(legacyRaw);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const [{ count: playersCount, error: playersCountErr }, { count: matchesCount, error: matchesCountErr }] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("matches").select("*", { count: "exact", head: true }),
  ]);

  if (playersCountErr) throw playersCountErr;
  if (matchesCountErr) throw matchesCountErr;

  if ((playersCount ?? 0) > 0 || (matchesCount ?? 0) > 0) {
    console.log(`Seed cancelado: players=${playersCount ?? 0}, matches=${matchesCount ?? 0}.`);
    console.log("Si queres forzar, limpia tablas primero desde Supabase.");
    return;
  }

  const playersInput = Object.entries(legacy.PLAYERS).map(([name, stats]) => ({
    nombre: normalizeName(name),
    apodo: normalizeName(name),
    foto_url: stats.foto ? `https://raw.githubusercontent.com/Kippess/panel-fyp/main/${stats.foto}` : null,
    activo: true,
  }));

  const { data: insertedPlayers, error: playersInsertErr } = await supabase
    .from("players")
    .insert(playersInput)
    .select("id, nombre");
  if (playersInsertErr) throw playersInsertErr;

  const playerIdByName = new Map(insertedPlayers.map((p) => [normalizeName(p.nombre), p.id]));
  const fallbackPlayerId = insertedPlayers[0]?.id ?? null;

  const matchesInput = legacy.MATCH_HISTORY.map((row) => {
    const name = normalizeName(row.mvp);
    const mvpId = name && name.toLowerCase() !== "sin mvp" ? playerIdByName.get(name) ?? null : null;
    const { a, b } = parseScores(row.resultado);
    return {
      fecha: ymdToIso(row.date),
      equipo_a_score: a,
      equipo_b_score: b,
      estado: "cerrado",
      mvp_player_id: mvpId,
      notas: "Migrado desde panel-fyp",
    };
  });

  const { data: insertedMatches, error: matchesInsertErr } = await supabase
    .from("matches")
    .insert(matchesInput)
    .select("id, fecha");
  if (matchesInsertErr) throw matchesInsertErr;

  const totalFondo = Number(legacy.FONDO_COMUN ?? 0);
  const totalMatches = insertedMatches.length;
  const baseMonto = totalMatches > 0 ? Math.floor(totalFondo / totalMatches) : 0;
  let remainder = totalFondo - baseMonto * totalMatches;

  const contributionRows = insertedMatches
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map((m, idx) => {
      const plus = remainder > 0 ? 1 : 0;
      if (remainder > 0) remainder -= 1;
      return {
        match_id: m.id,
        player_id: fallbackPlayerId,
        monto: baseMonto + plus,
        pagado: true,
      };
    })
    .filter((r) => r.player_id);

  if (contributionRows.length > 0) {
    const { error: contribErr } = await supabase.from("contributions").insert(contributionRows);
    if (contribErr) throw contribErr;
  }

  console.log("Seed completado.");
  console.log(`Players: ${insertedPlayers.length}`);
  console.log(`Matches: ${insertedMatches.length}`);
  console.log(`Contributions: ${contributionRows.length}`);
}

main().catch((err) => {
  console.error("Error en seed:", err?.message ?? err);
  process.exit(1);
});
