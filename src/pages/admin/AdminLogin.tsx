import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/components/auth/AdminAuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LocationState = {
  from?: string;
};

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, login, loading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!loading && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const from = (location.state as LocationState | null)?.from ?? "/admin";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email || !password) {
      toast.error("Completa correo y contrasena.");
      return;
    }
    setIsSubmitting(true);
    const { error } = await login(email, password);
    setIsSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Ingreso admin correcto.");
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-gradient-card p-6 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-black">Ingreso Admin</h1>
            <p className="text-sm text-muted-foreground">Gestion de partidos, jugadores, fondo y multas.</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Correo</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@correo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-password">Contrasena</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Ingresando..." : "Ingresar al panel"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
