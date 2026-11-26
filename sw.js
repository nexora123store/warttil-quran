const C='wq-v2';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.json','icon.svg','config.js','sync.js'])));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
const put=(r,res)=>{if(res&&res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp))}return res};
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||r.headers.has('range'))return;
  const u=new URL(r.url);
  if(u.hostname==='api.alquran.cloud')e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>put(r,x))));
  else if(u.origin===location.origin||u.hostname.startsWith('fonts.g'))e.respondWith(fetch(r).then(x=>put(r,x)).catch(()=>caches.match(r)))});
