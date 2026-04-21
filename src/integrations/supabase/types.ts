export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contributions: {
        Row: {
          created_at: string
          fecha: string
          id: string
          match_id: string
          monto: number
          pagado: boolean
          player_id: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          match_id: string
          monto?: number
          pagado?: boolean
          player_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          match_id?: string
          monto?: number
          pagado?: boolean
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contributions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
        ]
      }
      fines: {
        Row: {
          created_at: string
          fecha: string
          id: string
          match_id: string | null
          monto: number
          motivo: string
          pagada: boolean
          player_id: string
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          match_id?: string | null
          monto?: number
          motivo: string
          pagada?: boolean
          player_id: string
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          match_id?: string | null
          monto?: number
          motivo?: string
          pagada?: boolean
          player_id?: string
        }
        Relationships: []
      }
      goal_events: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          match_id: string
          minuto: number | null
          player_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          match_id: string
          minuto?: number | null
          player_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          match_id?: string
          minuto?: number | null
          player_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goal_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goal_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
        ]
      }
      match_players: {
        Row: {
          asistencias: number
          calificacion: number | null
          created_at: string
          equipo: Database["public"]["Enums"]["team_side"]
          goles: number
          id: string
          match_id: string
          player_id: string
          presente: boolean
          updated_at: string
        }
        Insert: {
          asistencias?: number
          calificacion?: number | null
          created_at?: string
          equipo: Database["public"]["Enums"]["team_side"]
          goles?: number
          id?: string
          match_id: string
          player_id: string
          presente?: boolean
          updated_at?: string
        }
        Update: {
          asistencias?: number
          calificacion?: number | null
          created_at?: string
          equipo?: Database["public"]["Enums"]["team_side"]
          goles?: number
          id?: string
          match_id?: string
          player_id?: string
          presente?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          equipo_a_score: number
          equipo_b_score: number
          estado: Database["public"]["Enums"]["match_status"]
          fecha: string
          gol_de_la_fecha_player_id: string | null
          id: string
          mvp_player_id: string | null
          notas: string | null
          updated_at: string
          votacion_abre: string | null
          votacion_cierra: string | null
        }
        Insert: {
          created_at?: string
          equipo_a_score?: number
          equipo_b_score?: number
          estado?: Database["public"]["Enums"]["match_status"]
          fecha: string
          gol_de_la_fecha_player_id?: string | null
          id?: string
          mvp_player_id?: string | null
          notas?: string | null
          updated_at?: string
          votacion_abre?: string | null
          votacion_cierra?: string | null
        }
        Update: {
          created_at?: string
          equipo_a_score?: number
          equipo_b_score?: number
          estado?: Database["public"]["Enums"]["match_status"]
          fecha?: string
          gol_de_la_fecha_player_id?: string | null
          id?: string
          mvp_player_id?: string | null
          notas?: string | null
          updated_at?: string
          votacion_abre?: string | null
          votacion_cierra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_gol_de_la_fecha_player_id_fkey"
            columns: ["gol_de_la_fecha_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_gol_de_la_fecha_player_id_fkey"
            columns: ["gol_de_la_fecha_player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "matches_mvp_player_id_fkey"
            columns: ["mvp_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_mvp_player_id_fkey"
            columns: ["mvp_player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
        ]
      }
      players: {
        Row: {
          activo: boolean
          apodo: string | null
          created_at: string
          elo: number
          fecha_alta: string
          foto_url: string | null
          id: string
          nombre: string
          posicion: Database["public"]["Enums"]["player_position"] | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apodo?: string | null
          created_at?: string
          elo?: number
          fecha_alta?: string
          foto_url?: string | null
          id?: string
          nombre: string
          posicion?: Database["public"]["Enums"]["player_position"] | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apodo?: string | null
          created_at?: string
          elo?: number
          fecha_alta?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          posicion?: Database["public"]["Enums"]["player_position"] | null
          updated_at?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          id: string
          match_id: string
          type: Database["public"]["Enums"]["vote_type"]
          voted_player_id: string
          voter_player_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          type: Database["public"]["Enums"]["vote_type"]
          voted_player_id: string
          voter_player_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          type?: Database["public"]["Enums"]["vote_type"]
          voted_player_id?: string
          voter_player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voted_player_id_fkey"
            columns: ["voted_player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_player_id_fkey"
            columns: ["voter_player_id"]
            isOneToOne: false
            referencedRelation: "rankings"
            referencedColumns: ["player_id"]
          },
        ]
      }
    }
    Views: {
      rankings: {
        Row: {
          apodo: string | null
          asistencias: number | null
          elo: number | null
          foto_url: string | null
          gol_fecha_count: number | null
          goles: number | null
          multas_pendientes: number | null
          mvp_count: number | null
          nombre: string | null
          partidos_jugados: number | null
          player_id: string | null
          promedio_calificacion: number | null
          puntos: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      match_status: "pendiente" | "jugado" | "cerrado"
      player_position: "arquero" | "defensor" | "mediocampista" | "delantero"
      team_side: "A" | "B"
      vote_type: "mvp" | "goal"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_status: ["pendiente", "jugado", "cerrado"],
      player_position: ["arquero", "defensor", "mediocampista", "delantero"],
      team_side: ["A", "B"],
      vote_type: ["mvp", "goal"],
    },
  },
} as const
