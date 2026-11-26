import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SessionRecord } from '../types';
import { listSessions, saveSession } from './storage';

// مزامنة اختيارية لسجل الجلسات مع Supabase (بيانات وصفية فقط: لا صوت ولا نص تفريغ).
// تعمل بحساب مجهول (Anonymous Auth) مرتبط بالمتصفح. الأمان يعتمد على Row Level Security في قاعدة البيانات.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!url || !key) throw new Error('الخدمة السحابية غير مضبوطة.');
  if (!client) client = createClient(url, key);
  return client;
}

async function userId(): Promise<string> {
  const s = sb();
  const { data } = await s.auth.getSession();
  if (data.session) return data.session.user.id;
  const { data: anon, error } = await s.auth.signInAnonymously();
  if (error || !anon.user) throw new Error(error?.message || 'تعذر إنشاء حساب مجهول. فعّل Anonymous sign-ins في Supabase.');
  return anon.user.id;
}

type Row = {
  id: string;
  user_id?: string;
  surah: number;
  from_ayah: number;
  to_ayah: number;
  recorded_at: string;
  duration_seconds: number;
  accuracy: number | null;
  status: 'completed' | 'partial';
  notes: string[];
};

function toRow(s: SessionRecord, uid: string): Row {
  return {
    id: s.id,
    user_id: uid,
    surah: s.surah,
    from_ayah: s.from,
    to_ayah: s.to,
    recorded_at: s.date,
    duration_seconds: s.durationSeconds,
    accuracy: s.accuracy,
    status: s.status,
    notes: s.notes,
  };
}

function fromRow(r: Row): SessionRecord {
  return {
    id: r.id,
    surah: r.surah,
    from: r.from_ayah,
    to: r.to_ayah,
    date: r.recorded_at,
    durationSeconds: r.duration_seconds,
    accuracy: r.accuracy === null ? null : Number(r.accuracy),
    status: r.status,
    notes: Array.isArray(r.notes) ? r.notes : [],
  };
}

export async function pushSession(s: SessionRecord): Promise<void> {
  const uid = await userId();
  const { error } = await sb().from('sessions').upsert(toRow(s, uid), { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

/** دمج ثنائي الاتجاه: ما ينقص السحابة يُرفع، وما ينقص الجهاز يُنزَّل. */
export async function syncAll(): Promise<void> {
  const uid = await userId();
  const { data, error } = await sb()
    .from('sessions')
    .select('*')
    .order('recorded_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(error.message);
  const remote = (data ?? []) as Row[];
  const local = await listSessions();
  const remoteIds = new Set(remote.map((r) => r.id));
  const localIds = new Set(local.map((l) => l.id));
  for (const r of remote) if (!localIds.has(r.id)) await saveSession(fromRow(r));
  const missing = local.filter((l) => !remoteIds.has(l.id));
  if (missing.length) {
    const { error: upErr } = await sb()
      .from('sessions')
      .upsert(missing.map((m) => toRow(m, uid)), { onConflict: 'id' });
    if (upErr) throw new Error(upErr.message);
  }
}

export async function clearRemote(): Promise<void> {
  const uid = await userId();
  const { error } = await sb().from('sessions').delete().eq('user_id', uid);
  if (error) throw new Error(error.message);
}
