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

const MAX_DIMENSION = 800; // px máx en cualquier lado
const QUALITY = 0.82;

const compressImage = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir la imagen"))),
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });

export const PhotoUploader = ({ nombre, currentUrl, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes (JPG, PNG, WEBP)");
      return;
    }
    try {
      setUploading(true);
      const compressed = await compressImage(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from("player-photos").upload(path, compressed, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
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
        <p className="text-[10px] text-muted-foreground">JPG, PNG o WEBP · se comprime automáticamente</p>
      </div>
    </div>
  );
};
