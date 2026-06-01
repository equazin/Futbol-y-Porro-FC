import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Election = Database["public"]["Tables"]["elections"]["Row"];
export type Candidate = Database["public"]["Tables"]["candidates"]["Row"];

export type CandidateWithPlayer = Candidate & {
  players: {
    id: string;
    nombre: string;
    apodo: string | null;
    foto_url: string | null;
  };
  vice?: {
    id: string;
    nombre: string;
    apodo: string | null;
    foto_url: string | null;
  } | null;
  votos?: number;
};

export type ElectionWithCandidates = Election & {
  candidates: CandidateWithPlayer[];
};

export type VoteCounts = Record<string, number>;

// ─── Queries ───────────────────────────────────────────────────────────────

export const useElections = () =>
  useQuery({
    queryKey: ["elections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Election[];
    },
  });

export const useActiveElection = () =>
  useQuery({
    queryKey: ["elections", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .neq("estado", "cerrada")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Election | null;
    },
  });

export const useElection = (id: string | null) =>
  useQuery({
    queryKey: ["elections", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Election;
    },
  });

export const useCandidates = (electionId: string | null) =>
  useQuery({
    queryKey: ["candidates", electionId],
    enabled: !!electionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select(
          `*, players (id, nombre, apodo, foto_url), vice:vice_player_id (id, nombre, apodo, foto_url)`
        )
        .eq("election_id", electionId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CandidateWithPlayer[];
    },
  });

export const useElectionVoteCounts = (
  electionId: string | null,
  round: number = 1
) =>
  useQuery({
    queryKey: ["election_vote_counts", electionId, round],
    enabled: !!electionId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_election_vote_counts", {
        p_election_id: electionId!,
        p_round: round,
      });
      if (error) throw error;
      const counts: VoteCounts = {};
      (data ?? []).forEach((row: { candidate_id: string; votos: number }) => {
        counts[row.candidate_id] = row.votos;
      });
      return counts;
    },
  });

export const useHasVotedElection = (
  electionId: string | null,
  dni: string,
  round: number = 1
) =>
  useQuery({
    queryKey: ["has_voted_election", electionId, round],
    enabled: !!electionId && dni.length >= 7,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_has_voted_election", {
        p_election_id: electionId!,
        p_dni: dni,
        p_round: round,
      });
      if (error) throw error;
      return data as boolean;
    },
  });

// ─── Mutations ─────────────────────────────────────────────────────────────

export const useCreateElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      titulo,
      postulacion_abre,
    }: {
      titulo: string;
      postulacion_abre?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_election", {
        p_titulo: titulo,
        p_postulacion_abre: postulacion_abre ?? new Date().toISOString(),
      });
      if (error) throw error;
      if (data?.status !== "ok") throw new Error(data?.status ?? "Error");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
    },
  });
};

export type RegisterCandidateInput = {
  election_id: string;
  dni: string;
  partido: string;
  vice_dni?: string;
  flyer_url?: string;
  propuesta_organizacion?: string;
  propuesta_votacion_premios?: string;
  propuesta_economia?: string;
  propuesta_convivencia?: string;
  propuesta_tercer_tiempo?: string;
  propuesta_infraestructura?: string;
  propuesta_constitucion?: string;
  propuesta_domingos?: string;
  propuesta_ausencias?: string;
  propuesta_equipos?: string;
  propuesta_presupuesto?: string;
  propuesta_convivencia2?: string;
  propuesta_foules?: string;
};

export const useRegisterCandidate = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegisterCandidateInput) => {
      const { data, error } = await supabase.rpc("register_candidate", {
        p_election_id: input.election_id,
        p_dni: input.dni,
        p_partido: input.partido,
        p_vice_dni: input.vice_dni ?? null,
        p_flyer_url: input.flyer_url ?? null,
        p_propuesta_organizacion: input.propuesta_organizacion ?? "",
        p_propuesta_votacion_premios: input.propuesta_votacion_premios ?? "",
        p_propuesta_economia: input.propuesta_economia ?? "",
        p_propuesta_convivencia: input.propuesta_convivencia ?? "",
        p_propuesta_tercer_tiempo: input.propuesta_tercer_tiempo ?? "",
        p_propuesta_infraestructura: input.propuesta_infraestructura ?? "",
        p_propuesta_constitucion: input.propuesta_constitucion ?? "",
        p_propuesta_domingos: input.propuesta_domingos ?? "",
        p_propuesta_ausencias: input.propuesta_ausencias ?? "",
        p_propuesta_equipos: input.propuesta_equipos ?? "",
        p_propuesta_presupuesto: input.propuesta_presupuesto ?? "",
        p_propuesta_convivencia2: input.propuesta_convivencia2 ?? "",
        p_propuesta_foules: input.propuesta_foules ?? "",
      });
      if (error) throw error;
      return data as { status: string; candidate_id?: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["candidates", vars.election_id] });
    },
  });
};

export const useCastElectionVote = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      election_id,
      dni,
      candidate_id,
      round = 1,
    }: {
      election_id: string;
      dni: string;
      candidate_id: string;
      round?: number;
    }) => {
      const { data, error } = await supabase.rpc("cast_election_vote", {
        p_election_id: election_id,
        p_dni: dni,
        p_candidate_id: candidate_id,
        p_round: round,
      });
      if (error) throw error;
      return data as { status: string };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["election_vote_counts", vars.election_id],
      });
      qc.invalidateQueries({
        queryKey: ["has_voted_election", vars.election_id],
      });
    },
  });
};

export const useOpenElectionVoting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      election_id,
      votacion_cierra,
    }: {
      election_id: string;
      votacion_cierra?: string;
    }) => {
      const { data, error } = await supabase.rpc("open_election_voting", {
        p_election_id: election_id,
        p_votacion_cierra: votacion_cierra ?? null,
      });
      if (error) throw error;
      return data as { status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
    },
  });
};

export const useCloseElectionVoting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (election_id: string) => {
      const { data, error } = await supabase.rpc("close_election_voting", {
        p_election_id: election_id,
      });
      if (error) throw error;
      return data as { status: string; winner_id?: string };
    },
    onSuccess: (_data, election_id) => {
      qc.invalidateQueries({ queryKey: ["elections"] });
      qc.invalidateQueries({ queryKey: ["candidates", election_id] });
      qc.invalidateQueries({ queryKey: ["election_vote_counts", election_id] });
    },
  });
};

export const useDeleteElection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (election_id: string) => {
      const { data, error } = await supabase.rpc("delete_election", {
        p_election_id: election_id,
      });
      if (error) throw error;
      return data as { status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["elections"] });
    },
  });
};

export type AdminVoteRow = {
  candidate_id: string;
  round: number;
  votos: number;
};

export const useElectionVotesAdmin = (electionId: string | null) =>
  useQuery({
    queryKey: ["election_votes_admin", electionId],
    enabled: !!electionId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_election_votes_admin", {
        p_election_id: electionId!,
      });
      if (error) throw error;
      return (data ?? []) as AdminVoteRow[];
    },
  });
