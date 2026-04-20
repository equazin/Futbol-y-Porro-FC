import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6 rounded-xl border border-dashed border-border bg-card/30">
    <div className="h-16 w-16 rounded-2xl bg-secondary grid place-items-center mb-4">
      <Icon className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="font-bold text-lg mb-1">{title}</h3>
    {description && <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>}
    {action && <Button onClick={action.onClick} variant="default">{action.label}</Button>}
  </div>
);
