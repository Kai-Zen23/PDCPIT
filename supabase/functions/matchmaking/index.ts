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
    const { playerName, isPrivate, matchId, action } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Scenario A: Queue Cancellation
    if (action === "cancel" && matchId) {
      await supabase.from("matches").delete().eq("id", matchId).eq("status", "WAITING");
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!playerName || typeof playerName !== "string") {
      return new Response(JSON.stringify({ error: "Invalid player name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Scenario B: Explicitly joining a target Private/Public Room by matchId
    if (matchId && action !== "cancel") {
      const { data: targetMatch, error: fetchErr } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .eq("status", "WAITING")
        .single();

      if (fetchErr || !targetMatch || targetMatch.player_count !== 1) {
        return new Response(JSON.stringify({ error: "Room is full, expired, or does not exist" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const matchState: MatchState = targetMatch.state;
      const playerId = nanoid(10);
      addSecondPlayer(matchState, playerId, playerName.trim());

      const { data: updated, error: updateErr } = await supabase
        .from("matches")
        .update({
          state: matchState,
          player_count: 2,
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId)
        .eq("player_count", 1)
        .select()
        .single();

      if (updateErr || !updated) {
        return new Response(JSON.stringify({ error: "Failed to join room due to conflict" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          matchId,
          playerId,
          role: "JOINED",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Scenario C: General Matchmaking - Check public queue only if this request is NOT marked private
    if (!isPrivate) {
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

        addSecondPlayer(matchState, playerId, playerName.trim());

        const { data: updated, error: updateErr } = await supabase
          .from("matches")
          .update({
            state: matchState,
            player_count: 2,
            updated_at: new Date().toISOString(),
          })
          .eq("id", matchRecord.id)
          .eq("player_count", 1)
          .select()
          .single();

        if (!updateErr && updated) {
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
      }
    }

    // Create a new match record (Private or Public depending on the isPrivate flag)
    const newMatchId = nanoid(10);
    const newPlayerId = nanoid(10);
    const matchState = createMatch(newMatchId, newPlayerId, playerName.trim(), Boolean(isPrivate));

    const { error: insertErr } = await supabase.from("matches").insert({
      id: newMatchId,
      status: "WAITING",
      is_private: Boolean(isPrivate),
      player_count: 1,
      state: matchState,
    });

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        matchId: newMatchId,
        playerId: newPlayerId,
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
