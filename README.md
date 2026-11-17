# agent-relay-engine 배포

agent-relay-engine 의 버전별 npm tarball 을 내려받는 곳이다. 패키지는 npm 레지스트리에 발행하지 않는다. 여기서 tarball 을 받아 `file:` 로 설치한다.

- 버전 목록과 파일: https://huansuh.github.io/agent-relay-engine-dist/
- 최신 버전: [`latest.json`](latest.json) → `versions/<버전>/MANIFEST.json`
- 각 tarball 안에 패키지 README 가 들어 있다(`package/README.md`).

## 패키지

| 패키지 | 함께 설치할 내부 패키지 |
|---|---|
| `@agent-relay-engine/core` | — |
| `@agent-relay-engine/claude` | core |
| `@agent-relay-engine/codex` | core |
| `@agent-relay-engine/side-fs` | core |
| `@agent-relay-engine/chat-server` | core |
| `@agent-relay-engine/chat-client` | — |
| `@agent-relay-engine/chat-ui` | chat-client |
| `@agent-relay-engine/ask` | core, side-fs |
| `@agent-relay-engine/testing` | core, claude |

내부 패키지끼리는 `^<버전>` 범위로 서로를 가리킨다. 쓰는 패키지와 그 패키지가 기대는 내부 패키지를 **모두** 같은 버전의 tarball 로 설치한다. 하나라도 빠지면 npm 이 레지스트리에서 찾다가 404 로 실패한다.

## 설치

1. 쓸 버전의 tarball 을 받아 프로젝트 안 폴더(예: `vendor/`)에 둔다.

```sh
V=1.8.6
mkdir -p vendor && cd vendor
for p in core claude; do
  curl -fLO "https://huansuh.github.io/agent-relay-engine-dist/versions/$V/agent-relay-engine-$p-$V.tgz"
done
curl -fL -o MANIFEST.json "https://huansuh.github.io/agent-relay-engine-dist/versions/$V/MANIFEST.json"
```

2. 받은 파일의 sha256 을 MANIFEST 와 대조한다.

```sh
node -e "const m=require('./MANIFEST.json'),c=require('crypto'),fs=require('fs');for(const p of m.packages){if(!fs.existsSync(p.file))continue;const h=c.createHash('sha256').update(fs.readFileSync(p.file)).digest('hex');console.log(h===p.sha256?'ok':'MISMATCH',p.file)}"
```

3. `package.json` 에 `file:` 로 적고 설치한다.

```json
{
  "dependencies": {
    "@agent-relay-engine/core": "file:vendor/agent-relay-engine-core-1.8.6.tgz",
    "@agent-relay-engine/claude": "file:vendor/agent-relay-engine-claude-1.8.6.tgz"
  }
}
```

```sh
npm install
```

`MANIFEST.json` 의 `integrity` 는 lockfile 의 `integrity` 와 같은 형식이라 lockfile 과 바로 비교할 수 있다.

## 버전 올리기

새 버전의 tarball 을 받아 `file:` 경로를 **모두** 새 버전으로 바꾸고 `npm install` 한다. 버전마다 할 일과 동작 변경은 각 버전 항목의 요약과 패키지 README 를 본다.

같은 버전의 tarball 은 한 번 올린 뒤 바꾸지 않는다.

## 라이선스

MIT
