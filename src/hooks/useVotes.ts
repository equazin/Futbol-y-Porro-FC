import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Vote = Database["public"]["Tables"]["votes"]["Row"];
export type VoteType = Database["public"]["Enums"]["vote_type"];

export const useVotes = (matchId?: string) =>
  useQuery({
    queryKey: ["votes", matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("*")
        .eq("match_id", matchId!);
      if (error) throw error;
      return data as Vote[];
    },
  });

export const useHasVoted = (matchId?: string, voterId?: string) =>
  useQuery({
    queryKey: ["votes", matchId, "by", voterId],
    enabled: !!matchId && !!voterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("type")
        .eq("match_id", matchId!)
        .eq("voter_player_id", voterId!);
      if (error) throw error;
      const types = new Set((data ?? []).map((v) => v.type));
      return { mvp: types.has("mvp"), goal: types.has("goal") };
    },
  });

export interface CastVotesInput {
  matchId: string;
  voterId: string;
  mvpVotedId: string;
  goalVotedId: string;
}

export const useCastVotes = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, voterId, mvpVotedId, goalVotedId }: CastVotesInput) => {
      const rows = [
        { match_id: matchId, voter_player_id: voterId, voted_player_id: mvpVotedId, type: "mvp" as VoteType },
        { match_id: matchId, voter_player_id: voterId, voted_player_id: goalVotedId, type: "goal" as VoteType },
      ];
      // UPSERT sobre la constraint única (match_id, voter_player_id, type)
      // evita pérdida de datos si el insert falla a mitad
      const { error } = await supabase
        .from("votes")
        .upsert(rows, { onConflict: "match_id,voter_player_id,type" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["votes", vars.matchId] });
      qc.invalidateQueries({ queryKey: ["votes", vars.matchId, "by", vars.voterId] });
    },
  });
};

/**
 * Cuenta votos por jugador, devuelve el ganador (con desempate por más votos, luego alfabético).
 */
export interface VoteTally {
  player_id: string;
  count: number;
}

export const tallyVotes = (votes: Vote[], type: VoteType): VoteTally[] => {
  const map = new Map<string, number>();
  votes.filter((v) => v.type === type).forEach((v) => {
    map.set(v.voted_player_id, (map.get(v.voted_player_id) ?? 0) + 1);
  });
  return Array.from(map.entries())
    .map(([player_id, count]) => ({ player_id, count }))
    .sort((a, b) => b.count - a.count);
};
