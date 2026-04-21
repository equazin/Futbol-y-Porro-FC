import { NavLink, Outlet } from "react-router-dom";
import { Home, Trophy, Vote, ShieldCheck, Calendar, Users, Wallet, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/partidos", label: "Partidos", icon: Calendar },
  { to: "/jugadores", label: "Jugadores", icon: Users },
  { to: "/ranking", label: "Ranking", icon: Trophy },
  { to: "/votacion", label: "Votar", icon: Vote },
  { to: "/fondo", label: "Fondo", icon: Wallet },
  { to: "/multas", label: "Multas", icon: Receipt },
  { to: "/admin/login", label: "Admin", icon: ShieldCheck },
];

export const AppLayout = () => {
  const logoSrc = `${import.meta.env.BASE_URL}apple-touch-icon.png`;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pt-20">
      <header className="hidden md:block fixed top-0 inset-x-0 z-40 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 shadow-glow grid place-items-center overflow-hidden">
              <img src={logoSrc} alt="Futbol y Porro FC" className="h-7 w-7 object-contain" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-black text-lg tracking-tight">Futbol y Porro FC</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Futbol y Porro de los domingos</span>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-smooth",
                    isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <header className="md:hidden sticky top-0 z-40 glass border-b border-border/50">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/40 shadow-glow grid place-items-center overflow-hidden shrink-0">
              <img src={logoSrc} alt="Futbol y Porro FC" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-black tracking-tight text-base truncate">Futbol y Porro FC</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate">Futbol y Porro de los domingos</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-6xl animate-float-up">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50">
        <div className="grid grid-cols-8">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-smooth",
                  isActive ? "text-primary" : "text-muted-foreground active:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn("h-9 w-9 rounded-lg grid place-items-center transition-smooth", isActive && "bg-primary/15")}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <span className="leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
