import { createClient } from "npm:@supabase/supabase-js@2.39.8";
import { commandDraw, commandPowerUp, commandReady, commandStand, startNextRound } from "../_shared/engine.ts";
import { matchCommandSchema } from "../_shared/types.ts";
import type { MatchState } from "../_shared/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const parsed = matchCommandSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid command payload structure" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { matchId, playerId, type, payload } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch match state
    const { data: matchRecord, error: fetchErr } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (fetchErr || !matchRecord) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchState: MatchState = matchRecord.state;

    // Security validation
    if (!matchState.players[playerId]) {
      return new Response(JSON.stringify({ error: "Not a player in this match" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Execute authoritative engine game transitions
    if (type === "READY") {
      commandReady(matchState, playerId);
    } else if (type === "DRAW") {
      commandDraw(matchState, playerId);
    } else if (type === "STAND") {
      commandStand(matchState, playerId);
    } else if (type === "NEXT_ROUND") {
      startNextRound(matchState);
    } else if (type === "POWER_UP") {
      commandPowerUp(matchState, playerId, payload);
    }

    // Persist mutated match state back to Postgres
    // Realtime subscribers receive the broadcast automatically instantly
    const { error: updateErr } = await supabase
      .from("matches")
      .update({
        state: matchState,
        status: matchState.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, status: matchState.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Game action failed" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
