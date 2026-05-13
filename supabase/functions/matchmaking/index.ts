import { createClient } from "npm:@supabase/supabase-js@2.39.8";
import { nanoid } from "npm:nanoid@5.0.6";
import { addSecondPlayer, createMatch } from "../_shared/engine.ts";
import type { MatchState } from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { playerName } = await req.json();
    if (!playerName || typeof playerName !== "string") {
      return new Response(JSON.stringify({ error: "Invalid player name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase Client with Admin access to bypass RLS for queues
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Check if there's any WAITING match with 1 player
    // We order by updated_at to ensure FIFO queue ordering
    const { data: waitingMatches, error: fetchErr } = await supabase
      .from("matches")
      .select("*")
      .eq("status", "WAITING")
      .eq("is_private", false)
      .eq("player_count", 1)
      .order("updated_at", { ascending: true })
      .limit(1);

    if (fetchErr) throw fetchErr;

    if (waitingMatches && waitingMatches.length > 0) {
      const matchRecord = waitingMatches[0];
      const matchState: MatchState = matchRecord.state;
      const playerId = nanoid(10);

      // Mutate state using engine logic
      addSecondPlayer(matchState, playerId, playerName.trim());

      // Optimistic concurrency control using match state versioning / exact match status check
      const { data: updated, error: updateErr } = await supabase
        .from("matches")
        .update({
          state: matchState,
          player_count: 2,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchRecord.id)
        .eq("player_count", 1) // Ensures no secondary player raced us
        .select()
        .single();

      if (!updateErr && updated) {
        // Success: Joined existing match
        return new Response(
          JSON.stringify({
            matchId: matchRecord.id,
            playerId,
            role: "JOINED",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
      // If updateErr occurred, it means another player raced us. Fall through to create a new match.
    }

    // 2. Create a new match if queue was empty or race condition lost
    const matchId = nanoid(10);
    const playerId = nanoid(10);
    const matchState = createMatch(matchId, playerId, playerName.trim(), false);

    const { error: insertErr } = await supabase.from("matches").insert({
      id: matchId,
      status: "WAITING",
      is_private: false,
      player_count: 1,
      state: matchState,
    });

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        matchId,
        playerId,
        role: "CREATED",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
