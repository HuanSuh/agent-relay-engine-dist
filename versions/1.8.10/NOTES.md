# agent-relay-engine 1.8.10 릴리스 노트

바뀐 범위: 1.8.9 → 1.8.10

### core

- **새 메서드 `Engine.forget(sessionId): Promise<boolean>`.** 세션 하나를 엔진 메모리에서 잊는다. 살아 있는 프로세스를 `evict()` 와 같은 경로로 내리고, 보낸 기록 쓰기가 저장소에 닿기를 기다린 뒤(`dispose()` 와 같은 상한, 최대 5초) 세션 상태를 지운다. 잊었으면 `true`, 모르는 세션이면 `false`. 저장소 기록은 지우지 않아 같은 id 의 다음 `turn()` 은 엔진을 새로 띄운 것처럼 기록을 읽어 잇는다. `evict()` 는 1.8.9 와 같다 — 세션 상태는 `dispose()` 까지 남는다. 턴마다 새 세션 id 로 바꾸는 소비자는 다 쓴 세션을 `forget()` 하면 엔진 메모리가 턴 수만큼 늘지 않는다. relay 엔진은 라우팅 표의 고정도, 풀(`pool.engine`)은 그 세션의 풀 기록도 지운다. 규칙은 core README 의 "세션의 수명".
- **새 오류 클래스 `ForgetError`.** `forget()` 의 거절이다(`ForkError` 와 같은 모양: `reason`·고정 문구 `message`·`resumable`·`detail?`). 진행 중 턴·큐·gate 대기 입력·답을 기다리는 승인 요청·진행 중 분기(원본·대상)·살아 있는 lease·이미 진행 중인 forget·풀 자리를 잡은 세션이면 아무것도 바꾸지 않고 `ForgetError{reason:'busy', resumable:true, detail:{cause}}`, 빈 id 는 `input`, `dispose()` 뒤에는 `disposed`, 프로세스를 내리지 못하면 `internal`(resumable, 원문은 `detail.cause`)이다. 잊는 동안 그 세션에 온 `turn()` 은 `error(busy)`, `fork()`·`consult()` 는 `ForkError(busy)`, `acquire()` 는 `null` 이다. lease 를 잡은 세션은 먼저 `release` 한 뒤 잊는다. 잊은 세션은 `clientMessageId` 기억도 사라지므로, 세션 id 를 회전하는 소비자는 잊은 뒤 입력마다 새 `clientMessageId` 를 쓴다.
- **`Engine` 을 직접 구현한 소비자는 `forget` 을 더해야 한다(타입 오류).** 선택 메서드가 아니다. 프로세스·저장소가 없는 구현이면 위 거절 규칙대로 메모리에서 지우기만 하면 된다. 엔진을 감싸는 래퍼는 안쪽 엔진의 `forget` 에 넘긴다. `createClaudeEngine`·`createCodexEngine`·`createRelayEngine`·풀·testing 의 메모리 엔진을 쓰는 소비자는 할 일이 없다.
- **결정 알림에 선택 칸 `toolUseId?`.** `core.permission_decided` 가 같은 요청의 `permission` 이벤트·`onPermissionRequest` 요청의 `toolUseId` 를 싣는다. 백엔드가 문자열로 주지 않은 요청이면 칸이 없다. 훅·사람·규칙·사전 승인·시간 초과·정책 거절 어느 경로든 같다. 칸이 늘기만 해 기존 소비자는 그대로다.
- **`onPermissionRequest` 의 `ctx` 에 선택 칸 `requestId?`.** 그 호출이 판정하는 요청의 id 로, 같은 요청의 `permission` 이벤트·`core.permission_decided` 의 `requestId` 와 같다. Claude·Codex 는 항상 준다. 소비자 할 일: 감사 기록에서 훅 판정 행과 결정 알림을 "같은 도구의 먼저 판정된 행" 순서로 잇고 있었다면 `ctx.requestId`(또는 `toolUseId`)로 바꾼다 — 시간 초과·죽은 프로세스·정책 거절이 섞여도 어긋나지 않는다.

### codex

- 서버 승인 요청의 `itemId` 가 문자열이 아니면 `toolUseId` 를 싣지 않는다(요청의 `toolUseId` 를 싣는 모든 payload — `permission` 이벤트·훅 요청·`core.permission_denied`·`core.permission_rule`·`core.permission_preapproved`·`codex.permission{warning:'updated-input-unsupported'}`·결정 알림). 1.8.9 는 받은 값을 그대로 실었다.

### chat-server

- `onPermissionDecided(info)` 의 `info` 에 선택 칸 `toolUseId?`(엔진이 문자열로 실었을 때만). SSE·기록·PROTOCOL 은 바뀌지 않는다.

---
