import { Banknote, CheckCircle2, AlertCircle, Receipt, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { useFondo } from "@/hooks/useRanking";
import { formatARS, FONDO } from "@/lib/scoring";

const Finanzas = () => {
  const { data: fondo, isLoading } = useFondo();

  if (isLoading) return <p className="text-muted-foreground">Cargando...</p>;
  if (!fondo) return <EmptyState icon={Wallet} title="Sin datos financieros" description="Cargá partidos y registrá aportes para ver el resumen." />;

  const { total, cobrado, pendiente, multasTotal, multasCobradas, multasPendientes, caja, manualSaldo } = fondo;
  const progreso = total > 0 ? Math.round((cobrado / total) * 100) : 0;
  const premiosTotal = FONDO.PREMIO_1 + FONDO.PREMIO_2;
  const superavit = caja - premiosTotal;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-primary/30 bg-gradient-card p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="h-5 w-5 text-primary" />
              <h1 className="text-2xl md:text-3xl font-black">Finanzas</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Resumen consolidado de aportes, multas y balance disponible.
            </p>
          </div>
          <div className="rounded-xl border border-mvp/40 bg-mvp/10 px-4 py-3 text-right shrink-0">
            <p className="text-[10px] uppercase font-bold text-mvp tracking-wider flex items-center justify-end gap-1">
              <Banknote className="h-3.5 w-3.5" /> Caja disponible
            </p>
            <p className="text-3xl font-black text-mvp">{formatARS(caja)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Aportes + multas + ajustes</p>
          </div>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Aportes cobrados" value={formatARS(cobrado)} icon={CheckCircle2} variant="mvp" />
        <StatCard label="Aportes pendientes" value={formatARS(pendiente)} icon={AlertCircle} variant="stats" />
        <StatCard label="Multas cobradas" value={formatARS(multasCobradas)} icon={Receipt} variant="primary" />
        <StatCard label="Multas pendientes" value={formatARS(multasPendientes)} icon={Receipt} />
      </div>

      {/* Progreso de cobranza */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 space-y-3">
        <h2 className="font-black">Cobranza de aportes</h2>
        <div className="flex justify-between text-xs font-bold">
          <span>{formatARS(cobrado)} cobrado de {formatARS(total)}</span>
          <span>{progreso}%</span>
        </div>
        <Progress value={progreso} />
        <p className="text-xs text-muted-foreground">
          Falta cobrar {formatARS(pendiente)} en aportes + {formatARS(multasPendientes)} en multas
          {" "}= <span className="font-bold text-foreground">{formatARS(pendiente + multasPendientes)} total pendiente</span>
        </p>
      </div>

      {/* Balance vs premios */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 space-y-3">
        <h2 className="font-black">Balance vs premios</h2>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-mvp/10 border border-mvp/30">
            <p className="text-[10px] uppercase font-bold text-mvp">1° puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_1)}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
            <p className="text-[10px] uppercase font-bold text-primary">2° puesto</p>
            <p className="font-black">{formatARS(FONDO.PREMIO_2)}</p>
          </div>
          <div className="p-3 rounded-lg bg-stats/10 border border-stats/30">
            <p className="text-[10px] uppercase font-bold text-stats">3° a 5°</p>
            <p className="font-black">Remera</p>
          </div>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-border/40">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Total premios en efectivo</p>
            <p className="font-black">{formatARS(premiosTotal)}</p>
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Caja actual</p>
            <p className="font-black">{formatARS(caja)}</p>
          </div>
          <div className={`flex-1 rounded-lg p-3 ${superavit >= 0 ? "bg-mvp/10 border border-mvp/30" : "bg-destructive/10 border border-destructive/30"}`}>
            <div className="flex items-center gap-1">
              {superavit >= 0
                ? <TrendingUp className="h-3.5 w-3.5 text-mvp" />
                : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
              <p className="text-[10px] uppercase font-bold">{superavit >= 0 ? "Superávit" : "Déficit"}</p>
            </div>
            <p className={`font-black ${superavit >= 0 ? "text-mvp" : "text-destructive"}`}>
              {superavit >= 0 ? "+" : ""}{formatARS(superavit)}
            </p>
          </div>
        </div>
      </div>

      {/* Desglose total */}
      <div className="rounded-2xl border border-border/60 bg-gradient-card p-4 space-y-2">
        <h2 className="font-black mb-3">Desglose completo</h2>
        {[
          { label: "Total aportes generados", value: total, color: "text-foreground" },
          { label: "Aportes cobrados", value: cobrado, color: "text-mvp" },
          { label: "Aportes pendientes", value: -pendiente, color: "text-destructive" },
          { label: "Total multas emitidas", value: multasTotal, color: "text-foreground" },
          { label: "Multas cobradas", value: multasCobradas, color: "text-primary" },
          { label: "Multas pendientes", value: -multasPendientes, color: "text-destructive" },
          { label: "Ajustes manuales", value: manualSaldo, color: manualSaldo >= 0 ? "text-primary" : "text-destructive" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-bold ${color}`}>{value < 0 ? `-${formatARS(-value)}` : formatARS(value)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 text-base">
          <span className="font-black">Caja disponible</span>
          <span className="font-black text-mvp text-lg">{formatARS(caja)}</span>
        </div>
      </div>
    </div>
  );
};

export default Finanzas;
