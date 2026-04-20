import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  nombre: string;
  foto_url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-20 w-20 text-lg",
};

export const PlayerAvatar = ({ nombre, foto_url, size = "md", className }: PlayerAvatarProps) => {
  const initials = nombre
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full overflow-hidden bg-gradient-primary grid place-items-center font-black text-primary-foreground shrink-0 ring-2 ring-border",
        sizeMap[size],
        className
      )}
    >
      {foto_url ? (
        <img src={foto_url} alt={nombre} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};
