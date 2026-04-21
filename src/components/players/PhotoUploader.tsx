import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlayerAvatar } from "./PlayerAvatar";

interface Props {
  nombre: string;
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const PhotoUploader = ({ nombre, currentUrl, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("La foto pesa más de 4MB. Probá con una más liviana.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes (JPG, PNG, WEBP)");
      return;
    }
    try {
      setUploading(true);
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("player-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("player-photos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Foto cargada");
    } catch (e: any) {
      toast.error(e.message ?? "Error subiendo la foto");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <PlayerAvatar nombre={nombre || "?"} foto_url={currentUrl} size="xl" />
      <div className="flex-1 space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Subiendo…</>
          ) : (
            <><Camera className="h-4 w-4 mr-2" /> {currentUrl ? "Cambiar foto" : "Subir foto"}</>
          )}
        </Button>
        {currentUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <X className="h-4 w-4 mr-2" /> Quitar foto
          </Button>
        )}
        <p className="text-[10px] text-muted-foreground">JPG, PNG o WEBP · máx. 4MB</p>
      </div>
    </div>
  );
};
