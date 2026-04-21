import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PANEL_FYP_DATA = path.resolve(PROJECT_ROOT, "..", "panel-fyp", "data.js");
const OUTPUT_SQL = path.resolve(PROJECT_ROOT, "supabase", "panel-fyp-link-seed.sql");

function parseLegacyData(raw) {
  const factory = new Function(`${raw}\nreturn { TOTAL_MATCHES, FONDO_COMUN, PLAYERS, MATCH_HISTORY };`);
  return factory();
}

function normalizeName(name) {
  if (!name) return name;
  return name.replace(/Ã±/g, "n").replace(/ñ/g, "n").trim();
}

function parseScores(rawResult) {
  const nums = (rawResult.match(/\d+/g) ?? []).map((n) => Number(n));
  return {
    a: Number.isFinite(nums[0]) ? nums[0] : 0,
    b: Number.isFinite(nums[1]) ? nums[1] : 0,
  };
}

function esc(str) {
  return String(str).replace(/'/g, "''");
}

function ymdToIso(dateYmd) {
  return `${dateYmd}T15:00:00.000Z`;
}

async function main() {
  const raw = await fs.readFile(PANEL_FYP_DATA, "utf8");
  const legacy = parseLegacyData(raw);

  const playerRows = Object.entries(legacy.PLAYERS).map(([name, stats]) => ({
    nombre: normalizeName(name),
    apodo: normalizeName(name),
    foto_url: stats.foto ? `https://raw.githubusercontent.com/Kippess/panel-fyp/main/${stats.foto}` : null,
  }));

  const totalFondo = Number(legacy.FONDO_COMUN ?? 0);
  const totalMatches = legacy.MATCH_HISTORY.length;
  const baseMonto = totalMatches > 0 ? Math.floor(totalFondo / totalMatches) : 0;
  let remainder = totalFondo - baseMonto * totalMatches;

  const lines = [];
  lines.push("-- =====================================================================");
  lines.push("-- panel-fyp -> kick-stats seed");
  lines.push("-- Generado automaticamente. Ejecutar en Supabase SQL Editor.");
  lines.push("-- =====================================================================");
  lines.push("");
  lines.push("begin;");
  lines.push("");
  lines.push("-- 1) Asegurar RLS abierta para este proyecto");
  lines.push("alter table if exists public.players enable row level security;");
  lines.push("alter table if exists public.matches enable row level security;");
  lines.push("alter table if exists public.match_players enable row level security;");
  lines.push("alter table if exists public.goal_events enable row level security;");
  lines.push("alter table if exists public.contributions enable row level security;");
  lines.push("alter table if exists public.votes enable row level security;");
  lines.push("alter table if exists public.fines enable row level security;");
  lines.push("");
  lines.push("drop policy if exists open_all_players on public.players;");
  lines.push("drop policy if exists open_all_matches on public.matches;");
  lines.push("drop policy if exists open_all_match_players on public.match_players;");
  lines.push("drop policy if exists open_all_goal_events on public.goal_events;");
  lines.push("drop policy if exists open_all_contributions on public.contributions;");
  lines.push("drop policy if exists open_all_votes on public.votes;");
  lines.push("drop policy if exists open_all_fines on public.fines;");
  lines.push("");
  lines.push("create policy open_all_players on public.players for all using (true) with check (true);");
  lines.push("create policy open_all_matches on public.matches for all using (true) with check (true);");
  lines.push("create policy open_all_match_players on public.match_players for all using (true) with check (true);");
  lines.push("create policy open_all_goal_events on public.goal_events for all using (true) with check (true);");
  lines.push("create policy open_all_contributions on public.contributions for all using (true) with check (true);");
  lines.push("create policy open_all_votes on public.votes for all using (true) with check (true);");
  lines.push("create policy open_all_fines on public.fines for all using (true) with check (true);");
  lines.push("");
  lines.push("-- 2) Limpieza minima para evitar duplicados");
  lines.push("delete from public.contributions;");
  lines.push("delete from public.votes;");
  lines.push("delete from public.goal_events;");
  lines.push("delete from public.match_players;");
  lines.push("delete from public.matches;");
  lines.push("delete from public.fines;");
  lines.push("delete from public.players;");
  lines.push("");
  lines.push("-- 3) Jugadores");
  lines.push("insert into public.players (nombre, apodo, foto_url, activo)");
  lines.push("values");
  lines.push(
    playerRows
      .map(
        (p) =>
          `  ('${esc(p.nombre)}', '${esc(p.apodo)}', ${p.foto_url ? `'${esc(p.foto_url)}'` : "null"}, true)`,
      )
      .join(",\n") + ";",
  );
  lines.push("");
  lines.push("-- 4) Partidos");
  lines.push("insert into public.matches (fecha, equipo_a_score, equipo_b_score, estado, mvp_player_id, notas)");
  lines.push("values");
  lines.push(
    legacy.MATCH_HISTORY.map((m) => {
      const name = normalizeName(m.mvp);
      const mvpRef =
        name && name.toLowerCase() !== "sin mvp"
          ? `(select id from public.players where nombre = '${esc(name)}' limit 1)`
          : "null";
      const scores = parseScores(m.resultado);
      return `  ('${ymdToIso(m.date)}', ${scores.a}, ${scores.b}, 'cerrado', ${mvpRef}, 'Migrado desde panel-fyp')`;
    }).join(",\n") + ";",
  );
  lines.push("");
  lines.push("-- 5) Fondo comun legacy (total exacto)");
  lines.push("with ordered_matches as (");
  lines.push("  select id, row_number() over (order by fecha asc, id asc) as rn");
  lines.push("  from public.matches");
  lines.push("), base_player as (");
  lines.push("  select id as player_id from public.players order by nombre asc limit 1");
  lines.push(")");
  lines.push("insert into public.contributions (match_id, player_id, monto, pagado)");
  lines.push("select");
  lines.push("  om.id,");
  lines.push("  bp.player_id,");
  lines.push(`  ${baseMonto} + case when om.rn <= ${remainder} then 1 else 0 end as monto,`);
  lines.push("  true as pagado");
  lines.push("from ordered_matches om");
  lines.push("cross join base_player bp;");
  lines.push("");
  lines.push("commit;");
  lines.push("");

  await fs.writeFile(OUTPUT_SQL, lines.join("\n"), "utf8");
  console.log(`SQL generado: ${OUTPUT_SQL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
