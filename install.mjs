#!/usr/bin/env node
// agent-relay-engine 설치 스크립트 — 고른 패키지와 그 내부 의존 tarball 을 받아 sha256 을 대조하고 package.json 에 file: 로 적는다.
// 사용: node install.mjs <버전|latest> [패키지…]   (예: node install.mjs 1.8.6 claude chat-server)
//   패키지를 안 주면 package.json 에 이미 있는 @agent-relay-engine/* 를 그 버전으로 올린다.
//   --dir <폴더>  tarball 을 둘 폴더(기본 vendor/agent-relay-engine)
//   --dry         받거나 쓰지 않고 할 일만 보인다
//   ARE_DIST_URL  받을 곳(기본 https://huansuh.github.io/agent-relay-engine-dist, 로컬 폴더 경로도 된다)
// Node 18 이상. npm install 은 직접 돌린다.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const SCOPE = '@agent-relay-engine/';
const BUNDLE = 'agent-relay-engine';
const base = (process.env.ARE_DIST_URL ?? 'https://huansuh.github.io/agent-relay-engine-dist').replace(/\/$/, '');
const local = !/^https?:\/\//.test(base);

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
const dry = args.includes('--dry'); if (dry) args.splice(args.indexOf('--dry'), 1);
const dirArg = flag('--dir') ?? 'vendor/agent-relay-engine';
const fail = (m) => { console.error(`install: ${m}`); process.exit(1); };
if (!args.length || args[0] === '-h' || args[0] === '--help') {
  console.log('사용: node install.mjs <버전|latest> [패키지…] [--dir <폴더>] [--dry]'); process.exit(args.length ? 0 : 1);
}

async function get(path, binary = false) {
  if (local) { const p = join(base, path); if (!existsSync(p)) throw new Error(`없음: ${p}`); return binary ? readFileSync(p) : readFileSync(p, 'utf8'); }
  const r = await fetch(`${base}/${path}`);
  if (!r.ok) throw new Error(`${r.status} ${base}/${path}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : r.text();
}

const pjPath = resolve('package.json');
if (!existsSync(pjPath)) fail('지금 폴더에 package.json 이 없다 — 프로젝트 루트에서 돌린다');
const pj = JSON.parse(readFileSync(pjPath, 'utf8'));
const sections = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
if (sections.some((s) => pj[s]?.[BUNDLE])) fail(`package.json 에 통합 패키지 '${BUNDLE}' 가 있다 — 한 프로젝트에서 개별 패키지와 섞어 쓰지 않는다`);

let version = args.shift();
try {
  if (version === 'latest') version = JSON.parse(await get('latest.json')).version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`버전 형식이 아니다: ${version}`);
  const man = JSON.parse(await get(`versions/${version}/MANIFEST.json`));
  const deps = JSON.parse(await get(`versions/${version}/deps.json`));

  const short = (n) => n.replace(SCOPE, '');
  const existing = new Set(sections.flatMap((s) => Object.keys(pj[s] ?? {})).filter((n) => n.startsWith(SCOPE)).map(short));
  const asked = args.map((a) => short(a));
  for (const a of asked) if (!deps[a]) fail(`${version} 에 없는 패키지: ${a} (있는 것: ${Object.keys(deps).join(', ')})`);
  if (!asked.length && !existing.size) fail('고른 패키지도, package.json 에 있는 @agent-relay-engine/* 도 없다');

  // 고른 것 + 이미 있는 것 + 그 내부 의존을 모두 같은 버전으로
  const want = new Set();
  const add = (n) => { if (want.has(n)) return; if (!deps[n]) fail(`${version} 에 없는 패키지(이미 쓰던 것): ${n}`); want.add(n); deps[n].deps.forEach(add); };
  [...asked, ...existing].forEach(add);

  const dir = resolve(dirArg);
  const sha = Object.fromEntries(man.packages.map((p) => [p.file, p.sha256]));
  console.log(`agent-relay-engine ${version}: ${[...want].join(', ')}`);
  if (!dry) mkdirSync(dir, { recursive: true });
  for (const n of want) {
    const file = deps[n].file;
    if (dry) { console.log(`  받을 것 ${file}`); continue; }
    const buf = await get(`versions/${version}/${file}`, true);
    if (createHash('sha256').update(buf).digest('hex') !== sha[file]) fail(`sha256 불일치: ${file} — 받은 파일을 쓰지 않았다`);
    writeFileSync(join(dir, file), buf);
    console.log(`  ok ${file}`);
  }

  // package.json: 이미 있던 칸은 그 자리(dependencies·devDependencies 등)에서, 새 것은 dependencies 에
  const rel = relative(resolve('.'), dir).split('\\').join('/');
  for (const n of want) {
    const spec = `file:${rel}/${deps[n].file}`;
    const sec = sections.find((s) => pj[s]?.[deps[n].name]) ?? 'dependencies';
    pj[sec] ??= {};
    if (pj[sec][deps[n].name] !== spec) console.log(`  ${sec}.${deps[n].name}: ${pj[sec][deps[n].name] ?? '(새로)'} → ${spec}`);
    pj[sec][deps[n].name] = spec;
  }
  if (!dry) writeFileSync(pjPath, JSON.stringify(pj, null, 2) + '\n');
  console.log(dry ? '(--dry: 아무것도 쓰지 않았다)' : `다음: npm install   · 릴리스 노트 ${base}/versions/${version}/NOTES.md 를 확인한다`);
} catch (err) {
  fail(err instanceof Error ? err.message : String(err));
}
