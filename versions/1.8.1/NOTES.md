# agent-relay-engine 1.8.1 릴리스 노트

바뀐 범위: 1.8.0 → 1.8.1

패치 버전이다. 공개 계약은 추가만 했다. 예외는 아래 오류 문구 변경이다.

- core·claude·codex: `resolveSession` 이 돌려준 값을 엔진이 검사해 거절한 턴(덮을 수 없는 칸, `cwd`·`mcpArgs`·`mcpContext`·`model` 모양 등)의 `error.message` 가 `세션 설정 실패: <검사 글>` 에서 고정 문구 `세션 설정 실패` 로 바뀌고, 검사 글은 `detail.cause` 로 옮겼다. 검사 글에 칸 이름 같은 소비자 값이 섞여 1.7.0 의 `message` 규칙(바깥 글은 `detail`)에 어긋났다. `message` 를 정규식으로 보던 코드는 `detail.cause` 를 본다.
- core: 같은 이유로 `fork` 의 `overrides` 검사 실패는 `ForkError(input, 'fork 옵션 overrides 가 틀렸다')` 이고 검사 글은 `detail.cause` 다(전에는 `fork 옵션 overrides: <검사 글>`). relay 에서 `resolveSession` 이 돌려준 `backend` 가 틀린 턴(설정에 없는 백엔드 등)은 `message` 가 `백엔드를 고르지 못했다` 이고 검사 글은 `detail.cause` 다.
- core: relay 의 `rememberRule`·`acquire` 가 세션의 백엔드를 고르다 설정 오류로 던지는 `Error` 도 `message` 가 고정 문구(`백엔드를 고르지 못했다` 등)이고 원문은 `Error.cause`(문자열)다. 1.8.0 은 원문을 `message` 에 실었다.

### chat-server

- **`onPermissionDecided` 의 `decidedBy`.** 신원 있는 답마다 토큰을 두고, `engine.answerPermission` 이 `true` 를 돌려준(엔진이 받은) 답의 사람만 붙인다. 1.8.0 은 같은 요청에 먼저 적힌 사람을 붙였다 — 익명 답과 신원 있는 답이 같은 `behavior` 로 동시에 오면 익명 답이 이겨도 신원 있는 사람이 붙을 수 있었다. 이제 그때는 `decidedBy` 가 없다. `answerPermission` 이 기다림을 거쳐 승인 대기표에 닿는 엔진(감싼 엔진 포함)도 맞게 귀속한다.
- **콜백 시점.** `core.permission_decided` 가 그 요청에 들어온 신원 있는 답들의 `answerPermission` 이 끝나기 전에 오면, 끝난 뒤에 콜백을 부른다. 콜백이 같은 턴의 다른 이벤트(`done` 등)보다 늦게 올 수 있다. 콜백 순서에 기대던 코드는 `requestId` 로 짝을 맞춘다.
  - 미룬 콜백은 다른 요청의 콜백·이벤트와 순서를 지키지 않는다. 기다림은 30초가 상한이다 — 그때까지 `answerPermission` 이 끝나지 않으면 그 답을 빼고 `decidedBy` 없이 부른다. 엔진이 받았지만 `core.permission_decided` 가 오지 않은 답의 토큰도 30초 뒤에 지운다.
- **ask 범위 조회.** 범위 항목을 밀어낸 적이 있는 세션(`trimmed`)에서는 범위 없는 질문 표시가 있어도 세션 기록을 먼저 읽는다. 기록의 `entries` 에 읽을 수 없는 원소가 있으면 `trimmed` 로 본다(범위를 모르는 질문의 답은 409). 묘비를 기록에 쓰지 못한 질문은 프로세스가 사는 동안 상한과 상관없이 409 다. `trimmed` 세션에서 저장소 장애로 기록을 읽지 못하면 범위 없는 질문의 답도 409 다(범위를 모른 채 열지 않는다. 저장소가 돌아오면 다시 보내면 된다). 소비자가 할 일은 없다.

### core

- **세션 덮어쓰기의 백엔드 이름 칸.** 선언 병합 인터페이스 `BackendSessionOverridesMap` 을 더했다(`BackendOptionsMap` 과 같은 꼴). 백엔드 패키지가 더한 칸은 `SessionOverrides` 의 선택 칸이 된다. `SessionOverrides` 는 이제 `CommonSessionOverrides & BackendSessionOverridesFields` 다 — 백엔드 칸을 선언하지 않은 프로그램에서는 전과 같은 모양이다.
- 그 칸을 받는 백엔드만 받는다. 다른 백엔드의 단독 엔진에 주면 지금처럼 `error(config)`(덮을 수 없는 칸)다. `createRelayEngine` 은 각 백엔드 엔진에 그 백엔드 이름 칸만 넘긴다.
- `ForkOptions.overrides` 의 타입은 `CommonSessionOverrides` 다(모양은 1.8.0 과 같다). 백엔드 이름 칸은 분기 세션의 `resolveSession` 에서 준다.
- backend-kit `checkOverrides(raw, backendKeys?)` 가 그 백엔드가 받는 이름 칸 목록을 받는다(백엔드를 직접 만드는 경우).
- `Metric` 이름에 `'fork.refuse_persist_failed'` 가 더해진다. 이름을 `switch` 로 빠짐없이 가르던 코드는 한 갈래를 더한다.
- **기록을 읽는 동안의 `stop()`.** 턴을 기록 읽기(`recover`) 전에 시작 전 턴으로 등록한다. 그 사이 온 `stop()` 은 `'pending'` 을 돌려주고 턴은 시작하지 않고 `error(stopped, resumable)` 로, 소비자가 떠났으면(`signal`) `done(interrupted)` 로 끝난다. 1.8.0 은 `'none'` 을 돌려주고 턴이 그대로 돌았다. 소비자가 할 일은 없다.

### claude

- **세션별 인자 파일.** `resolveSession` 이 `claude: { argFiles: {mode?, uid?, gid?, dir?} }` 를 돌려주면 그 세션의 인자 파일을 그 값으로 쓴다(타입 `ClaudeSessionOverrides`). 엔진 `claude.argFiles` 를 통째로 바꾸고(키별로 섞지 않는다), 검사는 엔진 칸과 같으며, 바뀌면 `config-changed` 로 다시 띄운다. `claude` 칸에서 `argFiles` 밖의 값은 받지 않는다. 자세히는 claude README '세션별 인자 파일'.
- 한 엔진을 여러 세션이 쓰며 세션마다 다른 uid 로 CLI 를 띄우던 소비자는 소유를 넘기던 자기 쪽 헬퍼(경로 검사 뒤 chown)를 지우고 이 칸으로 옮긴다. 세션마다 `dir` 이 다르면 `cleanupStaleMcpConfigFiles({ argFiles })` 를 `dir` 마다 부른다.
- **종료 신호 때 정리.** `removeLiveArgFiles()` 를 더했다. 이 프로세스가 만들어 아직 지우지 않은 인자 파일 폴더를 동기로 지우고 지운 수를 돌려준다. 엔진은 신호 처리기를 걸지 않는다 — SIGTERM·SIGINT 로 끝나는 서버는 자기 신호 처리기에서 부른다(claude README '종료 신호 때 정리').
- CLI 가 `--fork-session` 을 따르지 않아 닫은 분기 세션(`ext.claude.forkRefused`)을 기록하지 못하면 metric `fork.refuse_persist_failed` 를 낸다. 이 엔진 안에서는 메모리로 닫힌 채이지만, 재기동한 엔진은 기록의 `forkFrom` 으로 다시 분기를 시도한다.

### codex

- 옛 홈 옮기기 알림 `codex-home-migrated` 에 `skippedHardLinks`(옮기지 않은 하드링크 수)를 더했다. `removedLinks` 는 이제 하드링크를 세지 않는다(링크·특수 파일만). sqlite 는 `X.sqlite`·`-wal`·`-shm` 묶음 단위로 옮기고, 하나라도 옮기지 못하거나 본문(`X.sqlite`)이 없거나 본문 이름이 폴더면 묶음 전체가 `skipped` 에 들어간다. 소비자 할 일: `removedLinks` 로 하드링크까지 세던 코드는 `skippedHardLinks` 를 더한다.


---
