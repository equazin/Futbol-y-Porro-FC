import { NavLink, Outlet } from "react-router-dom";
import { Calendar, Home, LogOut, Receipt, ShieldCheck, Users, Wallet } from "lucide-react";
import { useAdminAuth } from "@/components/auth/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { to: "/admin", label: "Panel", icon: Home },
  { to: "/admin/partidos", label: "Partidos", icon: Calendar },
  { to: "/admin/jugadores", label: "Jugadores", icon: Users },
  { to: "/admin/fondo", label: "Fondo", icon: Wallet },
  { to: "/admin/multas", label: "Multas", icon: Receipt },
];

export const AdminLayout = () => {
  const { logout, email } = useAdminAuth();

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0 md:pt-20">
      <header className="hidden md:block fixed top-0 inset-x-0 z-40 glass border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="leading-tight">
              <p className="font-black text-base">Panel Admin</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground truncate max-w-[320px]">
                {email ?? "Admin"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1">
              {adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
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
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 max-w-6xl animate-float-up">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border/50">
        <div className="grid grid-cols-5">
          {adminNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/admin"}
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
