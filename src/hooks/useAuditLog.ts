import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/components/auth/AdminAuthProvider";

export type AuditAccion =
  | "partido_creado"
  | "partido_editado"
  | "partido_estado_cambiado"
  | "partido_eliminado"
  | "jugador_creado"
  | "jugador_editado"
  | "jugador_desactivado"
  | "voto_eliminado"
  | "votos_votante_eliminados"
  | "votacion_reseteada"
  | "votacion_cerrada"
  | "multa_creada"
  | "multa_eliminada"
  | "multa_pago_actualizado"
  | "aporte_pago_actualizado"
  | "bonus_creado"
  | "bonus_eliminado"
  | "victoria_historica_creada"
  | "victoria_historica_eliminada";

export interface AuditDetalle {
  [key: string]: unknown;
}

export const useAuditLog = () => {
  const { email } = useAdminAuth();

  const log = useCallback(
    async (
      accion: AuditAccion,
      entidad: string,
      entidadId?: string,
      detalle?: AuditDetalle
    ) => {
      if (!email) return;
      try {
        await (supabase as any).from("audit_logs").insert({
          accion,
          entidad,
          entidad_id: entidadId ?? null,
          detalle: detalle ?? null,
          admin_email: email,
        });
      } catch {
        // no bloquear la accion principal si el log falla
      }
    },
    [email]
  );

  return { log };
};
