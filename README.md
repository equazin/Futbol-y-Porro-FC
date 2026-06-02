# Fútbol y Porro FC

App web del club de fútbol dominguero Fútbol y Porro. Gestión de partidos, ranking ELO, votaciones, multas, fondo del club y elecciones presidenciales.

**Sitio:** https://equazin.github.io/Futbol-y-Porro-FC/

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RPC functions)
- **Router:** React Router v6 (HashRouter)
- **Estado:** TanStack React Query v5
- **Deploy:** GitHub Pages desde branch `gh-pages`

## Requisitos

- Node.js 20+
- npm 10+

## Variables de entorno

Crear `.env.local` en la raíz:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

## Comandos

<!-- AUTO-GENERATED -->
| Comando | Descripción |
|---------|-------------|
| `npm install` | Instalar dependencias |
| `npm run dev` | Servidor de desarrollo con hot reload (`localhost:5173`) |
| `npm run build` | Build de producción en `docs/` |
| `npm run deploy` | Build + publica a GitHub Pages (branch `gh-pages`) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview del build local |
| `npm test` | Tests con Vitest |
| `npm run test:watch` | Tests en modo watch |
<!-- END AUTO-GENERATED -->

## Páginas

| Ruta | Descripción |
|------|-------------|
| `/` | Inicio |
| `/partidos` | Historial de partidos |
| `/jugadores` | Lista de jugadores |
| `/ranking` | Ranking ELO público |
| `/votar` | Votación MVP / Gol de la Fecha |
| `/eleccion` | Elección presidencial (temporada) |
| `/fondo` | Fondo del club |
| `/multas` | Multas |
| `/admin/*` | Panel de administración (requiere login) |

## Base de datos

Las migraciones se aplican manualmente en el **SQL Editor de Supabase** en orden cronológico:

| Migración | Descripción |
|-----------|-------------|
| `20260420...` | Schema base: players, matches, votes, player_identities |
| `20260421...` | Bonuses, fine_presets, trigger upsert votos |
| `20260422...` | Stats históricas |
| `20260428...` | Fund movements, ELO friendly, venues |
| `20260511...` | Controles admin de votación |
| `20260526...` | Verificación DNI para votos |
| `20260527...` | Audit logs |
| `20260601000000` | Sistema de elecciones (elections, candidates, election_votes) |
| `20260601000001` | Admin: delete_election, get_election_votes_admin |
| `20260601000002` | Elecciones: vice_player_id + flyer_url en candidates |
| `20260601000003` | Storage bucket `election-flyers` |
| `20260601000004` | Admin: delete_candidate() |

## Storage buckets

| Bucket | Uso |
|--------|-----|
| `player-photos` | Fotos de jugadores |
| `goal-videos` | Videos de goles |
| `election-flyers` | Flyers de candidatos electorales (3:4 vertical) |

## Deploy

```bash
npm run deploy
```

Hace build y publica a la branch `gh-pages`. GitHub Pages está configurado en `gh-pages / (root)`.
