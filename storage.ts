import { openDB, type IDBPDatabase } from 'idb';
import type { SessionRecord } from '../types';

// التخزين المحلي بـ IndexedDB. إذا لم يكن متاحًا (مثلًا بعض أوضاع التصفح الخاص) نرجع لذاكرة مؤقتة بدل أن ينهار التطبيق.
const memory = new Map<string, SessionRecord>();
let dbp: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  const p =
    dbp ??
    openDB('warttil-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions', { keyPath: 'id' });
      },
    });
  dbp = p;
  return p;
}

export async function saveSession(s: SessionRecord): Promise<void> {
  try {
    const db = await getDb();
    await db.put('sessions', s);
  } catch {
    memory.set(s.id, s);
  }
}

export async function listSessions(): Promise<SessionRecord[]> {
  let all: SessionRecord[];
  try {
    const db = await getDb();
    all = (await db.getAll('sessions')) as SessionRecord[];
  } catch {
    all = Array.from(memory.values());
  }
  return all.sort((a, b) => b.date.localeCompare(a.date));
}

export async function clearSessions(): Promise<void> {
  memory.clear();
  try {
    const db = await getDb();
    await db.clear('sessions');
  } catch {
    /* تجاهل */
  }
}
