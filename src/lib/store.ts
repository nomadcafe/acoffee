import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Pin, Subscriber } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;
if (url && serviceKey) {
  supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
}

type MemDB = { pins: Pin[]; subscribers: Subscriber[] };
const g = globalThis as unknown as { __nm_db?: MemDB };
const mem: MemDB = (g.__nm_db ??= { pins: [], subscribers: [] });

export async function listPins(limit = 500): Promise<Pin[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("pins")
      .select("id, lat, lng, nickname, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      lat: r.lat as number,
      lng: r.lng as number,
      nickname: (r.nickname as string | null) ?? null,
      createdAt: r.created_at as string,
    }));
  }
  return mem.pins.slice(-limit).reverse();
}

export async function addPin(input: {
  lat: number;
  lng: number;
  nickname: string | null;
  ip: string | null;
}): Promise<Pin> {
  if (supabase) {
    const { data, error } = await supabase
      .from("pins")
      .insert({
        lat: input.lat,
        lng: input.lng,
        nickname: input.nickname,
        ip: input.ip,
      })
      .select("id, lat, lng, nickname, created_at")
      .single();
    if (error) throw error;
    return {
      id: data.id as string,
      lat: data.lat as number,
      lng: data.lng as number,
      nickname: (data.nickname as string | null) ?? null,
      createdAt: data.created_at as string,
    };
  }
  const pin: Pin = {
    id: randomUUID(),
    lat: input.lat,
    lng: input.lng,
    nickname: input.nickname,
    createdAt: new Date().toISOString(),
  };
  mem.pins.push(pin);
  return pin;
}

export async function addSubscriber(input: {
  email: string;
  city: string | null;
}): Promise<{ ok: true; duplicate: boolean }> {
  if (supabase) {
    const { error } = await supabase
      .from("subscribers")
      .insert({ email: input.email, city: input.city });
    if (error) {
      if (error.code === "23505") return { ok: true, duplicate: true };
      throw error;
    }
    return { ok: true, duplicate: false };
  }
  if (mem.subscribers.some((s) => s.email === input.email)) {
    return { ok: true, duplicate: true };
  }
  mem.subscribers.push({
    id: randomUUID(),
    email: input.email,
    city: input.city,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, duplicate: false };
}

export function isUsingSupabase() {
  return supabase !== null;
}
