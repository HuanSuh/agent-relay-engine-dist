# agent-relay-engine 1.8.12 릴리스 노트

바뀐 범위: 1.8.11 → 1.8.12

### claude

- **세션별 추가 폴더 — `resolveSession` 의 `claude.addDirs`.** `ClaudeSessionOverrides` 에 선택 칸 `addDirs?: string[]`. 세션 값은 엔진 `claude.addDirs` 를 통째로 바꾼다(합치지 않는다, `[]` 는 추가 폴더 없음). 검사는 엔진 칸과 같고(절대 경로·최대 32개·빈 값·상대·`-` 시작·제어 문자·중복 금지, 엔진 `extraArgs` 의 `--add-dir` 와 함께면 설정 오류) 틀리면 그 턴은 CLI 를 띄우지 않고 `error(config, '세션 설정 실패')`, 검사 글은 `detail.cause` 다. 값이 바뀌면 다음 턴 전에 같은 대화로 다시 띄운다(`core.restart{reason:'config-changed'}`). `started.permissions.backend.addDirs` 는 그 세션의 개수다. 범위 턴·`consult`·분기와 relay(`validateConfig` 포함)는 엔진 칸과 같게 다룬다(분기·`consult` 세션은 다른 세션 칸처럼 새 세션 id 로 훅을 부른다 — 원본 폴더는 `ctx.record?.ext?.fork?.from` 으로 찾는다). 훅이 분기·`consult` 의 새 id 에 `{}` 를 돌려주면 엔진 칸 `claude.addDirs` 가 쓰여 원본 세션보다 넓어질 수 있다 — 훅은 그 id 에도 답하고, 모르는 id 는 `[]` 로 닫는다. `claude` 칸에서 받는 것은 `argFiles`·`addDirs` 둘이고, 다른 칸(`sandbox`·`extraArgs` 등)은 지금처럼 `error(config)` 다.
- 영향: 1.8.11 까지 `resolveSession` 의 `claude.addDirs` 는 `error(config)` 였다. 그 오류를 기대하던 코드·테스트. spawn 단계에서 `--add-dir` 를 직접 붙이던 구성(엔진 칸 `addDirs` 와 겹치지 않으면 지금도 돈다).
- 소비자 할 일: 없음. 세션마다 폴더를 바꾸려면 spawn 의 `--add-dir` 대신 훅에서 `claude: { addDirs }` 를 돌려준다(엔진 칸 `addDirs` 나 `extraArgs` 의 `--add-dir` 와 섞어 쓰지 않는다). 자세히는 claude README '세션별 claude 칸'.

### testing

- **Codex 가짜의 `mcpStrictTools` 가 실제 Codex(0.164.0) 모양을 낸다.** 목록 밖 MCP 도구를 부르면 `mcpToolCall` item 을 내지 않고 그 단계를 건너뛴다(서버 수신 0건, `transformToolArgs` 훅도 부르지 않음, 턴은 정상 이어짐). 1.8.11 까지는 실패 item 을 내 엔진 이벤트 `tool-start`·`tool{isError:true}` 가 생겼다. Claude 가짜는 그대로다. 기본(끔)과 목록 안 도구는 달라지지 않는다.
- 영향: Codex 가짜 + `mcpStrictTools` 에서 목록 밖 호출의 실패 `tool` 이벤트(`No such tool available` 문구)를 기대하던 테스트.
- 소비자 할 일: 그 기대를 "그 도구의 `tool-start`·`tool` 이벤트 없음, 서버 수신 없음"으로 바꾼다.

---
