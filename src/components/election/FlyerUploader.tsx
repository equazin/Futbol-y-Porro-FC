import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  currentUrl: string | null;
  onChange: (url: string | null) => void;
}

const FLYER_BUCKET = "election-flyers";
const MAX_WIDTH = 1200;
const QUALITY = 0.88;

const compressFlyer = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo comprimir el flyer"))),
        "image/jpeg",
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });

export const FlyerUploader = ({ currentUrl, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Solo imágenes (JPG, PNG, WEBP)");
      return;
    }
    try {
      setUploading(true);
      const compressed = await compressFlyer(file);
      const path = `${crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage.from(FLYER_BUCKET).upload(path, compressed, {
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(FLYER_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Flyer cargado");
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : "") || "Error subiendo el flyer";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
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

      {currentUrl ? (
        <div className="relative inline-block">
          <div
            className="rounded-xl overflow-hidden border border-border"
            style={{ width: "160px", aspectRatio: "3/4" }}
          >
            <img src={currentUrl} alt="Flyer" className="w-full h-full object-cover" />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 rounded-full bg-destructive/90 p-1 text-white hover:bg-destructive transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
          style={{ width: "160px", aspectRatio: "3/4" }}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus size={24} className="text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground text-center px-2">
            {uploading ? "Subiendo…" : "Subir flyer\n(3:4 vertical)"}
          </span>
        </button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full max-w-[160px]"
      >
        {uploading ? (
          <><Loader2 size={14} className="mr-1 animate-spin" /> Subiendo…</>
        ) : (
          <><ImagePlus size={14} className="mr-1" /> {currentUrl ? "Cambiar flyer" : "Seleccionar imagen"}</>
        )}
      </Button>
      <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · recomendado vertical (3:4)</p>
    </div>
  );
};
