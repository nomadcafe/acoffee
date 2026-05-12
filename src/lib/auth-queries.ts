import type {
  Checkin,
  ContactReveal,
  Intent,
  IntentKind,
  IntentResponseStatus,
  MyProfile,
} from "./types";
import { listActiveCheckinsAtCafe, lookupEmail } from "./store";
import { createSupabaseServer, isAuthConfigured } from "./supabase/server";

// Auth-scoped reads. RLS scopes results to the signed-in user automatically.
// Use these from Server Components / Actions that need user-specific state.

export async function getMyActiveCheckinAtCafe(
  cafeId: string,
): Promise<Checkin | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("checkins")
    .select("id, profile_id, cafe_id, note, expires_at, created_at")
    .eq("profile_id", user.id)
    .eq("cafe_id", cafeId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as string,
    profileId: data.profile_id as string,
    cafeId: data.cafe_id as string,
    note: (data.note as string | null) ?? null,
    expiresAt: data.expires_at as string,
    createdAt: data.created_at as string,
  };
}

export async function getMyProfile(): Promise<MyProfile | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("handle, bio, telegram_handle, whatsapp_number")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    handle: data.handle as string,
    bio: (data.bio as string | null) ?? null,
    telegramHandle: (data.telegram_handle as string | null) ?? null,
    whatsappNumber: (data.whatsapp_number as string | null) ?? null,
  };
}

// Compact view of "what's currently active for me" — used by the sticky strip
// under the nav. Returns null when nothing's live so the strip can short-circuit.
export type ActiveSession = {
  checkin: { cafeName: string; cafeSlug: string; expiresAt: string } | null;
  intent: {
    kind: IntentKind;
    city: string;
    expiresAt: string;
    // Count of OTHER users still in 'pending' state on this intent — the
    // "you have responses waiting" badge in the status strip. Goes to 0 once
    // the owner accepts one (acceptResponse auto-declines the rest).
    pendingResponseCount: number;
  } | null;
  // Most recent accepted match the viewer is in, either as host (someone
  // responded to my intent and I accepted) or responder (I responded to
  // someone's intent and they accepted). Surfaces in the sticky strip so
  // the user doesn't miss "@alex accepted you" while scrolling around.
  match: { otherHandle: string; intentKind: IntentKind } | null;
};

export async function getMyActiveSession(): Promise<ActiveSession | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();
  const [checkinResult, intentResult, matchAsHostResult, matchAsResponderResult] =
    await Promise.all([
      supabase
        .from("checkins")
        .select("expires_at, cafe:cafes(name, slug)")
        .eq("profile_id", user.id)
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("intents")
        .select("id, kind, city, expires_at")
        .eq("profile_id", user.id)
        .gt("expires_at", nowIso)
        .maybeSingle(),
      // Match as host: my intent was accepted by a responder.
      supabase
        .from("intent_responses")
        .select(
          "created_at, intent:intents!inner(profile_id, kind), responder:profiles!inner(handle)",
        )
        .eq("status", "accepted")
        .eq("intent.profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Match as responder: I responded to someone's intent and they accepted.
      supabase
        .from("intent_responses")
        .select(
          "created_at, intent:intents!inner(kind, profile_id, owner:profiles!inner(handle))",
        )
        .eq("responder_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const checkinRow = checkinResult.data;
  const cafeJoin = checkinRow?.cafe as
    | { name?: string; slug?: string }
    | { name?: string; slug?: string }[]
    | undefined;
  const cafe = Array.isArray(cafeJoin) ? cafeJoin[0] : cafeJoin;

  const checkin =
    checkinRow && cafe?.name && cafe?.slug
      ? {
          cafeName: cafe.name,
          cafeSlug: cafe.slug,
          expiresAt: checkinRow.expires_at as string,
        }
      : null;

  const intentRow = intentResult.data;
  let pendingResponseCount = 0;
  if (intentRow) {
    const { count } = await supabase
      .from("intent_responses")
      .select("id", { count: "exact", head: true })
      .eq("intent_id", intentRow.id as string)
      .eq("status", "pending");
    pendingResponseCount = count ?? 0;
  }
  const intent = intentRow
    ? {
        kind: intentRow.kind as IntentKind,
        city: intentRow.city as string,
        expiresAt: intentRow.expires_at as string,
        pendingResponseCount,
      }
    : null;

  // Pick the more recent of the two match queries.
  const match = pickMostRecentMatch(
    matchAsHostResult.data,
    matchAsResponderResult.data,
  );

  if (!checkin && !intent && !match) return null;
  return { checkin, intent, match };
}

function pickMostRecentMatch(
  asHost: unknown,
  asResponder: unknown,
): ActiveSession["match"] {
  const host = parseMatchAsHost(asHost);
  const resp = parseMatchAsResponder(asResponder);
  if (host && resp) {
    return host.createdAt > resp.createdAt ? host.match : resp.match;
  }
  return host?.match ?? resp?.match ?? null;
}

function parseMatchAsHost(
  raw: unknown,
): { createdAt: string; match: { otherHandle: string; intentKind: IntentKind } } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as {
    created_at?: string;
    intent?: { kind?: string } | { kind?: string }[];
    responder?: { handle?: string } | { handle?: string }[];
  };
  const intent = Array.isArray(r.intent) ? r.intent[0] : r.intent;
  const responder = Array.isArray(r.responder) ? r.responder[0] : r.responder;
  if (!intent?.kind || !responder?.handle || !r.created_at) return null;
  return {
    createdAt: r.created_at,
    match: {
      otherHandle: responder.handle,
      intentKind: intent.kind as IntentKind,
    },
  };
}

function parseMatchAsResponder(
  raw: unknown,
): { createdAt: string; match: { otherHandle: string; intentKind: IntentKind } } | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as {
    created_at?: string;
    intent?:
      | { kind?: string; owner?: { handle?: string } | { handle?: string }[] }
      | { kind?: string; owner?: { handle?: string } | { handle?: string }[] }[];
  };
  const intent = Array.isArray(r.intent) ? r.intent[0] : r.intent;
  if (!intent?.kind || !r.created_at) return null;
  const owner = Array.isArray(intent.owner) ? intent.owner[0] : intent.owner;
  if (!owner?.handle) return null;
  return {
    createdAt: r.created_at,
    match: {
      otherHandle: owner.handle,
      intentKind: intent.kind as IntentKind,
    },
  };
}

// Symmetric reveal: returns the full roster (handles, notes, time-since)
// ONLY when the caller is themselves in the roster. Null means "not in
// the room, you only get the aggregate count." This matches vision §4's
// "10x more precise than 'someone nearby'" promise while keeping the
// physical co-presence required for the social reveal.
export type RosterEntry = {
  id: string;
  profileId: string;
  handle: string;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  intent: {
    id: string;
    kind: IntentKind;
    expiresAt: string;
  } | null;
  // Viewer's response to this person's intent, if any. Null when the viewer
  // hasn't responded OR when this row has no intent OR when this is the
  // viewer's own row.
  myResponseStatus: IntentResponseStatus | null;
  // This person's response to the viewer's intent, if any. Lets the owner
  // see/accept/decline incoming responses directly from the roster row of
  // the responder — physical co-presence + match action in one place.
  theirResponseToMe: { id: string; status: IntentResponseStatus } | null;
  isMe: boolean;
};

export async function getRosterAtCafe(
  cafeId: string,
): Promise<RosterEntry[] | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await listActiveCheckinsAtCafe(cafeId);
  const viewerIn = rows.some((r) => r.profileId === user.id);
  if (!viewerIn) return null;

  // (a) Viewer's responses to others' intents in this roster.
  const intentIds = rows
    .filter((r) => r.intent && r.profileId !== user.id)
    .map((r) => r.intent!.id);
  let myResponseByIntent = new Map<string, IntentResponseStatus>();
  if (intentIds.length > 0) {
    const { data: responses } = await supabase
      .from("intent_responses")
      .select("intent_id, status")
      .eq("responder_id", user.id)
      .in("intent_id", intentIds);
    myResponseByIntent = new Map(
      (responses ?? []).map((r) => [
        r.intent_id as string,
        r.status as IntentResponseStatus,
      ]),
    );
  }

  // (b) Others' responses to viewer's own intent — needed so the owner can
  // accept/decline directly from the roster row of each responder.
  let theirResponseByResponder = new Map<
    string,
    { id: string; status: IntentResponseStatus }
  >();
  const viewerEntry = rows.find((r) => r.profileId === user.id);
  if (viewerEntry?.intent) {
    const otherProfileIds = rows
      .filter((r) => r.profileId !== user.id)
      .map((r) => r.profileId);
    if (otherProfileIds.length > 0) {
      const { data: incoming } = await supabase
        .from("intent_responses")
        .select("id, responder_id, status")
        .eq("intent_id", viewerEntry.intent.id)
        .in("responder_id", otherProfileIds);
      theirResponseByResponder = new Map(
        (incoming ?? []).map((r) => [
          r.responder_id as string,
          {
            id: r.id as string,
            status: r.status as IntentResponseStatus,
          },
        ]),
      );
    }
  }

  return rows.map((r) => ({
    ...r,
    myResponseStatus: r.intent
      ? myResponseByIntent.get(r.intent.id) ?? null
      : null,
    theirResponseToMe:
      r.profileId !== user.id
        ? theirResponseByResponder.get(r.profileId) ?? null
        : null,
    isMe: r.profileId === user.id,
  }));
}

// Lightweight Account-section stats for /profile. Joined date comes from
// profiles.created_at (set by the handle_new_user trigger on signup) so we
// don't need the auth.admin reveal here. Matches count both directions
// (host-accepted-someone + I-was-accepted), since both feel like 'matches'
// to the user.
export type ProfileStats = {
  joinedAt: string;
  checkinCount: number;
  intentCount: number;
  matchCount: number;
};

export async function getMyProfileStats(): Promise<ProfileStats | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    profileRes,
    checkinsRes,
    intentsRes,
    matchAsHostRes,
    matchAsResponderRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("checkins")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
    supabase
      .from("intents")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id),
    // Matches as host: my intent was accepted.
    supabase
      .from("intent_responses")
      .select("intent!inner(profile_id), id", { count: "exact", head: true })
      .eq("status", "accepted")
      .eq("intent.profile_id", user.id),
    // Matches as responder: I responded and was accepted.
    supabase
      .from("intent_responses")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .eq("responder_id", user.id),
  ]);

  if (!profileRes.data) return null;

  return {
    joinedAt: profileRes.data.created_at as string,
    checkinCount: checkinsRes.count ?? 0,
    intentCount: intentsRes.count ?? 0,
    matchCount: (matchAsHostRes.count ?? 0) + (matchAsResponderRes.count ?? 0),
  };
}

export async function getSessionUser(): Promise<{
  id: string;
  email: string | null;
} | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

// --- Intent views ---------------------------------------------------------

export type IncomingResponse = {
  id: string;
  responderId: string;
  responderHandle: string;
  responderContact: ContactReveal | null; // only set when status === "accepted"
  status: IntentResponseStatus;
  createdAt: string;
};

export type MyIntentView = {
  intent: Intent;
  incomingResponses: IncomingResponse[];
};

export async function getMyIntentView(): Promise<MyIntentView | null> {
  if (!isAuthConfigured()) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const nowIso = new Date().toISOString();
  const { data: intent, error } = await supabase
    .from("intents")
    .select("id, profile_id, kind, city, expires_at, created_at")
    .eq("profile_id", user.id)
    .gt("expires_at", nowIso)
    .maybeSingle();
  if (error) throw error;
  if (!intent) return null;

  const { data: responses, error: respErr } = await supabase
    .from("intent_responses")
    .select(
      "id, responder_id, status, created_at, responder:profiles!intent_responses_responder_id_fkey(handle, bio, telegram_handle, whatsapp_number)",
    )
    .eq("intent_id", intent.id)
    .order("created_at", { ascending: true });
  if (respErr) throw respErr;

  const enriched: IncomingResponse[] = await Promise.all(
    (responses ?? []).map(async (r) => {
      const status = r.status as IntentResponseStatus;
      const responderId = r.responder_id as string;
      const responder = extractProfileJoin(
        (r as { responder?: unknown }).responder,
      );
      const handle = responder.handle ?? "unknown";
      const contact: ContactReveal | null =
        status === "accepted"
          ? {
              email: await lookupEmail(responderId),
              telegramHandle: responder.telegram_handle ?? null,
              whatsappNumber: responder.whatsapp_number ?? null,
              bio: responder.bio ?? null,
            }
          : null;
      return {
        id: r.id as string,
        responderId,
        responderHandle: handle,
        responderContact: contact,
        status,
        createdAt: r.created_at as string,
      };
    }),
  );

  return {
    intent: {
      id: intent.id as string,
      profileId: intent.profile_id as string,
      kind: intent.kind as IntentKind,
      city: intent.city as string,
      expiresAt: intent.expires_at as string,
      createdAt: intent.created_at as string,
    },
    incomingResponses: enriched,
  };
}

export type OtherIntentView = {
  intent: Intent;
  ownerHandle: string;
  ownerContact: ContactReveal | null; // only set when my response is accepted
  // Lightweight presence signal: is this owner currently checked in somewhere?
  // Helps responders self-filter ("they're actually in town and working
  // right now" vs "just posted from somewhere"). Null = no active check-in.
  ownerCheckin: { cafeName: string; cafeSlug: string } | null;
  myResponse: {
    id: string;
    status: IntentResponseStatus;
  } | null;
};

// PostgREST returns FK joins as either a single object or a [obj] array
// depending on the relationship. Normalize to the inner object's fields.
function extractProfileJoin(raw: unknown): {
  handle?: string;
  bio?: string | null;
  telegram_handle?: string | null;
  whatsapp_number?: string | null;
} {
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (!obj || typeof obj !== "object") return {};
  const o = obj as {
    handle?: string;
    bio?: string | null;
    telegram_handle?: string | null;
    whatsapp_number?: string | null;
  };
  return {
    handle: o.handle,
    bio: o.bio ?? null,
    telegram_handle: o.telegram_handle ?? null,
    whatsapp_number: o.whatsapp_number ?? null,
  };
}

export async function listOtherActiveIntentsView(
  city: string,
): Promise<OtherIntentView[]> {
  if (!isAuthConfigured()) return [];
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const nowIso = new Date().toISOString();
  const { data: intents, error } = await supabase
    .from("intents")
    .select(
      "id, profile_id, kind, city, expires_at, created_at, owner:profiles!intents_profile_id_fkey(handle, bio, telegram_handle, whatsapp_number)",
    )
    .eq("city", city)
    .gt("expires_at", nowIso)
    .neq("profile_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!intents || intents.length === 0) return [];

  const intentIds = intents.map((i) => i.id as string);
  const ownerIds = Array.from(
    new Set(intents.map((i) => i.profile_id as string)),
  );

  const [myResponsesRes, ownerCheckinsRes] = await Promise.all([
    supabase
      .from("intent_responses")
      .select("id, intent_id, status")
      .in("intent_id", intentIds)
      .eq("responder_id", user.id),
    // Active check-in per owner (most recent if multiple). Most owners have
    // ≤1 active anyway because checkIn now ends prior sessions; .order +
    // first-write-wins handles legacy rows.
    supabase
      .from("checkins")
      .select("profile_id, created_at, cafe:cafes(name, slug)")
      .in("profile_id", ownerIds)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false }),
  ]);
  if (myResponsesRes.error) throw myResponsesRes.error;
  if (ownerCheckinsRes.error) throw ownerCheckinsRes.error;

  const responseByIntent = new Map<
    string,
    { id: string; status: IntentResponseStatus }
  >(
    (myResponsesRes.data ?? []).map((r) => [
      r.intent_id as string,
      { id: r.id as string, status: r.status as IntentResponseStatus },
    ]),
  );

  const checkinByOwner = new Map<
    string,
    { cafeName: string; cafeSlug: string }
  >();
  for (const row of ownerCheckinsRes.data ?? []) {
    const profileId = row.profile_id as string;
    if (checkinByOwner.has(profileId)) continue; // first (most recent) wins
    const join = row.cafe as
      | { name?: string; slug?: string }
      | { name?: string; slug?: string }[]
      | null
      | undefined;
    const cafe = Array.isArray(join) ? join[0] : join;
    if (cafe?.name && cafe?.slug) {
      checkinByOwner.set(profileId, {
        cafeName: cafe.name,
        cafeSlug: cafe.slug,
      });
    }
  }

  return Promise.all(
    intents.map(async (i) => {
      const intentId = i.id as string;
      const profileId = i.profile_id as string;
      const myResp = responseByIntent.get(intentId) ?? null;
      const owner = extractProfileJoin((i as { owner?: unknown }).owner);
      const ownerContact: ContactReveal | null =
        myResp?.status === "accepted"
          ? {
              email: await lookupEmail(profileId),
              telegramHandle: owner.telegram_handle ?? null,
              whatsappNumber: owner.whatsapp_number ?? null,
              bio: owner.bio ?? null,
            }
          : null;
      return {
        intent: {
          id: intentId,
          profileId,
          kind: i.kind as IntentKind,
          city: i.city as string,
          expiresAt: i.expires_at as string,
          createdAt: i.created_at as string,
        },
        ownerHandle: owner.handle ?? "unknown",
        ownerContact,
        ownerCheckin: checkinByOwner.get(profileId) ?? null,
        myResponse: myResp,
      };
    }),
  );
}
