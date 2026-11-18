# agent-relay-engine 1.8.11 릴리스 노트

바뀐 범위: 1.8.10 → 1.8.11

### core

- **결정 알림에 선택 칸 `overridden?: {behavior, via}`.** `core.permission_decided` 가 엔진이 받았지만 지고 보내지 않은 결정을 싣는다 — 받은 답과 실제로 보낸 답이 다를 때만. 예: 사람이 허용했는데 엔진 정책이 거절해 보냈으면 `{behavior:'deny', via:'policy', overridden:{behavior:'allow', via:'human'}}`. 칸이 늘기만 해 기존 소비자는 그대로다. 소비자 할 일: 감사에 "사람은 허용했지만 정책으로 거절됨"을 남기려면 이 칸을 읽는다. 규칙은 core README "진 결정".
- 백엔드 키트의 `PermissionDecided`(`noteDecided`·`decidedNotice` 입력)에도 같은 선택 칸이 있다. 보낸 답과 같은 값이면 알림에 싣지 않는다.

### claude

- 실패가 걸렸거나 내려가는 프로세스(1.8.9), 끼워 넣기로 좁아진 도구 범위에 늦게 온 허용(훅·기억한 규칙·사전 승인·사람)을 거절로 바꿀 때 결정 알림에 `overridden:{behavior:'allow', via}` 를 싣는다. 동작은 1.8.10 과 같다.

### codex

- 바뀐 `updatedInput` 의 허용을 거절할 때(`codex.permission{warning:'updated-input-unsupported'}`) 결정 알림에 `overridden:{behavior:'allow', via}`(허용한 사람·훅)를 싣는다. 동작은 1.8.10 과 같다.

### chat-server

- **정책이 덮은 허용의 카드 결말을 고친다.** `POST /permission` 의 허용을 엔진이 받았지만 거절을 보냈으면, 그 카드의 결말을 `{behavior:'deny', via, overridden:{behavior:'allow', rule?, decidedBy?}}` 로 고치고 SSE `permission-settled` 를 같은 `requestId` 로 다시 보낸다. 기록·`history` 스냅샷에도 고친 결말이 남는다. 1.8.10 은 카드가 '허용'으로 남아 감사(`via:'policy'` 거절)와 어긋났다. 권한 동작은 같다. "항상 허용"과 함께 보낸 허용이 덮여도 규칙은 저장돼 남고, 고친 결말의 `overridden.rule` 에 그 표기가 있다. 한계: `overridden` 을 싣지 않는 옛 엔진에서 결정 알림이 서버의 허용 결말보다 먼저 오면 카드는 허용으로 남는다(엔진도 함께 1.8.11 로 올리면 없다).
- **`onPermissionDecided(info)` 의 `info` 에 선택 칸 `overridden?: {behavior, via, decidedBy?, rule?}`.** `decidedBy` 는 진 결정이 사람의 것이고 받아들여진 신원 있는 답과 같을 때만이다(규칙은 chat-server README). 바깥 `decidedBy` 규칙은 1.8.10 과 같다.
- 공개 타입 `PermissionOutcome` 의 `deny` 에 선택 칸 `via?`·`overridden?` 이 늘었다. 결말을 `behavior` 로 고르는 소비자는 할 일이 없다.

### chat-client

- `PermissionOutcome` 의 `deny` 에 선택 칸 `via?`·`overridden?`. 다시 온 `permission-settled` 는 1.8.10 처럼 결말을 바꾼다. 고친 결말을 받은 뒤 도착한 `POST /permission` 응답이 결말을 허용으로 되돌리지 않고, 상태줄의 `allowed-running` 은 `denied` 로 바뀐다.

### chat-ui

- 정책이 덮은 승인 카드는 "거부됨(정책) · 허용했지만 엔진 정책이 거부함" 으로 보이고(진 허용이 규칙을 남겼으면 " · 항상 허용은 기억됨: <규칙>" 을 덧붙인다) `data-outcome="deny"`·`data-overridden="allow"` 를 단다. `outcomeText` 도 같은 문구를 돌려준다.

---
