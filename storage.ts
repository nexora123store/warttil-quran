import {openDB} from 'idb'; import type {SessionRecord} from '../types';
const dbp=openDB('warttil-db',1,{upgrade(db){db.createObjectStore('sessions',{keyPath:'id'});}});
export async function saveSession(s:SessionRecord){const db=await dbp; await db.put('sessions',s);}
export async function listSessions():Promise<SessionRecord[]>{const db=await dbp; return (await db.getAll('sessions')).sort((a,b)=>b.date.localeCompare(a.date));}
export async function clearSessions(){const db=await dbp; await db.clear('sessions');}