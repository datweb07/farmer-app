/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Tables and RPCs are added by migration 046.
import { supabase } from "../supabase/supabase";

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export async function loadSeasonWorkspace(isAdmin) {
  const [matchesResult, suppliesResult, demandsResult, transactionsResult] = await Promise.all([
    supabase.from("season_matches").select("*").order("created_at", { ascending: false }),
    supabase.from("season_supplies").select("*").order("updated_at", { ascending: false }),
    supabase.from("season_demands").select("*").order("updated_at", { ascending: false }),
    supabase.from("season_transactions").select("id, transaction_code, match_id, confirmed_at").order("confirmed_at", { ascending: false }),
  ]);
  const matches = unwrap(matchesResult) ?? [];
  let supplies = unwrap(suppliesResult) ?? [];
  let demands = unwrap(demandsResult) ?? [];

  if (isAdmin) {
    const [allSuppliesResult, allDemandsResult] = await Promise.all([
      supabase.from("season_supplies").select("*").eq("status", "open").order("updated_at", { ascending: false }),
      supabase.from("season_demands").select("*").eq("status", "open").order("updated_at", { ascending: false }),
    ]);
    supplies = unwrap(allSuppliesResult) ?? [];
    demands = unwrap(allDemandsResult) ?? [];
  }

  const partyIds = [...new Set([
    ...matches.flatMap((match) => [match.farmer_id, match.business_id]),
    ...supplies.map((item) => item.farmer_id),
    ...demands.map((item) => item.business_id),
  ])];
  let profiles = [];
  if (partyIds.length) {
    const profileResult = await supabase.from("profiles").select("id, username, avatar_url, role").in("id", partyIds);
    profiles = unwrap(profileResult) ?? [];
  }
  return { matches, supplies, demands, profiles, transactions: unwrap(transactionsResult) ?? [] };
}

export async function loadSeasonMatchDetails(match) {
  const [supplyResult, demandResult, messagesResult, proposalsResult, transactionResult] = await Promise.all([
    supabase.from("season_supplies").select("*").eq("id", match.supply_id).single(),
    supabase.from("season_demands").select("*").eq("id", match.demand_id).single(),
    supabase.from("season_messages").select("*").eq("match_id", match.id).order("created_at"),
    supabase.from("season_proposals").select("*").eq("match_id", match.id).order("version", { ascending: false }),
    supabase.from("season_transactions").select("*").eq("match_id", match.id).maybeSingle(),
  ]);
  return {
    supply: unwrap(supplyResult),
    demand: unwrap(demandResult),
    messages: unwrap(messagesResult) ?? [],
    proposals: unwrap(proposalsResult) ?? [],
    transaction: unwrap(transactionResult),
  };
}

export async function saveSeasonListing(table, id, values) {
  const query = id
    ? supabase.from(table).update(values).eq("id", id).select().single()
    : supabase.from(table).insert(values).select().single();
  return unwrap(await query);
}

export async function updateSeasonListingStatus(table, id, status) {
  return unwrap(await supabase.from(table).update({ status }).eq("id", id));
}

export async function inviteSeasonMatch(supplyId, demandId, reason) {
  return unwrap(await supabase.rpc("admin_invite_season_match", {
    p_supply_id: supplyId,
    p_demand_id: demandId,
    p_reason: reason,
  }));
}

export async function respondToSeasonMatch(matchId, response) {
  return unwrap(await supabase.rpc("respond_to_season_match", { p_match_id: matchId, p_response: response }));
}

export async function sendSeasonMessage(matchId, body) {
  return unwrap(await supabase.rpc("send_season_message", { p_match_id: matchId, p_body: body }));
}

export async function createSeasonProposal(matchId, terms) {
  return unwrap(await supabase.rpc("create_season_proposal", { p_match_id: matchId, p_terms: terms }));
}

export async function confirmSeasonProposal(proposalId) {
  return unwrap(await supabase.rpc("confirm_season_proposal", { p_proposal_id: proposalId }));
}

export async function rejectSeasonProposal(proposalId) {
  return unwrap(await supabase.rpc("reject_season_proposal", { p_proposal_id: proposalId }));
}
