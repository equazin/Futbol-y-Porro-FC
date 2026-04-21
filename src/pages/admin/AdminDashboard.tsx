import { Link } from "react-router-dom";
import { Calendar, Receipt, Users, Wallet } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { useFondo } from "@/hooks/useRanking";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatARS } from "@/lib/scoring";

const quickActions = [
  { to: "/admin/partidos", label: "Gestionar partidos", icon: Calendar },
  { to: "/admin/jugadores", label: "Gestionar jugadores", icon: Users },
  { to: "/admin/fondo", label: "Gestionar fondo", icon: Wallet },
  { to: "/admin/multas", label: "Gestionar multas", icon: Receipt },
];

const AdminDashboard = () => {
  const { data: matches = [] } = useMatches();
  const { data: players = [] } = usePlayers(false);
  const { data: fondo } = useFondo();

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
        <h1 className="text-2xl md:text-3xl font-black">Panel de administracion</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Este panel tiene permisos para manejar solo partidos, jugadores, fondo y multas.
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Partidos" value={matches.length} icon={Calendar} variant="stats" />
        <StatCard label="Jugadores" value={players.length} icon={Users} variant="primary" />
        <StatCard label="Fondo total" value={formatARS(fondo?.total ?? 0)} icon={Wallet} variant="mvp" />
        <StatCard label="Multas pendientes" value={formatARS(fondo?.multasPendientes ?? 0)} icon={Receipt} />
      </section>

      <section className="grid sm:grid-cols-2 gap-3">
        {quickActions.map(({ to, label, icon: Icon }) => (
          <Button
            key={to}
            asChild
            variant="outline"
            className="h-16 justify-start px-4 border-border/60 bg-gradient-card hover:border-primary/50"
          >
            <Link to={to}>
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </Link>
          </Button>
        ))}
      </section>
    </div>
  );
};

export default AdminDashboard;
