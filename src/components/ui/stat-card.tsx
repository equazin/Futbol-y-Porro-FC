import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: "default" | "mvp" | "stats" | "primary";
  hint?: string;
  className?: string;
}

const variantStyles: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "bg-gradient-card border-border/60",
  mvp: "bg-gradient-card border-mvp/40 shadow-mvp",
  stats: "bg-gradient-card border-stats/40",
  primary: "bg-gradient-card border-primary/40 shadow-glow",
};

const iconStyles: Record<NonNullable<StatCardProps["variant"]>, string> = {
  default: "bg-secondary text-foreground",
  mvp: "bg-gradient-mvp text-mvp-foreground",
  stats: "bg-gradient-stats text-stats-foreground",
  primary: "bg-gradient-primary text-primary-foreground",
};

export const StatCard = ({ label, value, icon: Icon, variant = "default", hint, className }: StatCardProps) => {
  return (
    <div className={cn(
      "relative rounded-xl border p-4 transition-smooth hover:scale-[1.02] hover:-translate-y-0.5",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground truncate">
            {label}
          </p>
          <p className="text-2xl md:text-3xl font-black tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn(
            "h-10 w-10 rounded-lg grid place-items-center shrink-0",
            iconStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
};
