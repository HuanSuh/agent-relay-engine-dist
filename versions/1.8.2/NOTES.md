# agent-relay-engine 1.8.2 릴리스 노트

바뀐 범위: 1.8.1 → 1.8.2

패치 버전이다. 공개 계약은 추가만 했다. 소비자가 할 일은 없다. 아래는 바뀐 동작이다.

### core

- **이미 끊긴 `signal`.** `turn(sessionId, input, { signal })` 에 이미 abort 된 signal 을 주면 기록 읽기를 기다리지 않고 바로 턴을 끊는다(`done(interrupted)`). 기록 읽기·gate 를 기다리는 턴은 `dispose()` 가 거두며, 그 턴은 `error(disposed)` 로 끝난다.
- **control 중지 뒤의 표기.** CLI 가 control 중지를 받아 끝내는 중이면, 유예(`interruptGraceMs`) 초과·`dispose()`·evict 가 신호로 다시 끊지 않는다. `stop()` 결과·metric·`interrupted.via` 가 `'control'` 로 맞는다.
- **Windows 의 env 이름.** `engineEnv`·`isApiBillingVar`·`isOuterSessionVar` 는 Windows 에서 변수 이름의 대소문자를 가리지 않는다(`anthropic_api_key`·`ClaudeCode` 도 지운다). 다른 플랫폼은 그대로다.
- **점검 캐시.** `detectBackends` 의 캐시 키에 `inheritOuterSession` 이 들었다. 이 칸만 다른 설정은 따로 점검한다.

### claude

- **MCP 연결 보장 검사의 `no-tools` 판정.** 모든 서버를 거부하는 `mcp__*` 규칙이 있으면 어느 서버도 `no-tools` 로 보지 않는다. 이름이 다른 서버 이름의 앞부분인 서버(`a` 와 `a__b` 가 함께 있을 때의 `a`)도 `a__b` 의 것으로 센 도구가 있으면 보지 않는다 — `mcp__a__b__x` 가 어느 서버 도구인지 이름만으로는 모른다. 연결 상태(`failed` 등) 판정은 그대로다.

### codex

- **지킬 수 없는 금지 도구의 오류 문구.** `disallowedTools` 의 내장 도구 항목(`Bash`·`Edit` 등)을 지킬 수 없을 때의 `message` 가 고정 문구(어디의 설정인지와 대안)다. 1.8.1 은 항목 이름을 `message` 끝에 이어 붙였다. 항목 이름은 쉼표로 이은 글로 옮겼다 — 턴의 `error{reason:'config'}` 와 `fork()` 의 `ForkError(config)` 는 `detail.cause`, 엔진 생성 때 던지는 `UnenforceableToolsError` 는 `tools`(배열)·`cause` 다. `message` 에서 항목 이름을 찾던 코드는 이 칸을 본다. relay 의 `skipped{reason:'config'}.detail` 에는 고정 문구만 간다.
- **`codex --version` 의 환경 변수.** 감지(`detect`)가 버전을 물을 때도 app-server 를 띄울 때와 같은 규칙으로 env 를 거른다. 구독 인증만 허용하면 과금 API 키를 넘기지 않고, 바깥 세션 문맥(`AGENT_RELAY_ENGINE_*`)은 늘 지운다. 소비자가 할 일은 없다.
- **옛 홈 옮기기.** 항목 수(20만 개)·시간(5분) 상한이 옛 홈의 최상위 목록에도 걸린다. 목록을 읽은 뒤 사라진 항목은 실패가 아니라 건너뛰고, sqlite 묶음의 멤버가 사라졌으면 그 묶음 전체를 건너뛴다. `codex-home-migrated` 의 `removedLinks`·`skippedHardLinks` 는 허용 목록의 최상위 항목(`sessions/`·`archived_sessions/`·sqlite 묶음)과 그 아래에서 옮기지 않은 것을 항목 하나에 한 번씩 센다. 1.8.1 은 최상위 링크·특수 파일과 sqlite 묶음 안의 링크·FIFO 를 세지 않았다. `skipped` 의 이름은 옛 홈에서 읽은 그대로라 믿지 말고, 화면·로그에 낼 때는 이스케이프한다.
- **승인 답과 함께 보낸 턴의 중지.** 승인 답을 기록한 직후, 2단 중지가 control 단계에 들어간 틈에 `stop()` 이 오면 입력(turn/start)을 보내지 않고 닫는다. 1.8.1 은 그 틈에 입력을 보낸 뒤 신호로 끊어, 아무도 보지 않는 턴이 대화 기록에 남을 수 있었다. 소비자가 할 일은 없다.

### chat-ui

- **`errorLabel` 호출 빈도.** 상태줄의 턴 오류 글은 같은 오류를 보는 동안(같은 상태·같은 함수) 다시 만들지 않는다. 전에는 응답이 자랄 때마다(토큰마다) 상태줄을 다시 그리며 `errorLabel` 을 불렀다. 이제 오류 칸 하나와 상태줄 하나에서 한 번씩만 불린다. 함수는 입력이 같으면 같은 글을 돌려주는 순수 함수여야 한다는 기존 전제는 그대로다. 함수를 바꾸면 바로 다시 그린다.
- **묶음 도구 카드의 호출 블록.** `group-tools` 로 묶은 카드 안 호출 블록(펼친 선택·텍스트 선택을 지키려고 다시 쓰는 노드)의 기억을 요소마다 따로 둔다. 같은 스토어 항목을 두 `<agent-relay-engine-chat>` 이 그려도 한 노드를 서로 가져가지 않는다. 한 요소 안의 동작은 같다.



### chat-server

- **`GET /sessions/:id/status` 의 `engine`·`GET /metrics` 의 `pool.sessions`.** 엔진 상태를 허용 목록의 칸(`sessionId`·`started`·`process`·`queueDepth`·`lastActivityAt`·`usage`·`awaitingPermissionSince`·`backend`·`lease`)만 골라 낸다. 엔진이 타입 밖 칸을 붙여도 나가지 않는다. `lease` 는 `owner` 를 내지 않고 `{sessionId, expiresAt}` 만 남는다. `owner` 는 서버 내부 식별자(호스트·프로세스 이름 등)라 브라우저에 보일 칸이 아니다. 이 칸을 읽던 화면은 서버의 엔진 `status()` 를 직접 본다.
- **미룬 `onPermissionDecided`.** `answerPermission` 결과를 기다리며 최대 30초 미뤄 둔 콜백을 `close()`·`flush()` 때와, 엔진 `dispose` 로 턴이 끝나거나(`error` `reason:'disposed'`) 턴 스트림이 깨져 끝날 때 바로 부른다. 전에는 그 사이 프로세스가 끝나면 콜백(감사 기록)이 빠졌다. 결과를 아직 모르는 답은 빼고 부르므로 `decidedBy` 가 없을 수 있다(fail-closed). 콜백은 한 번만 불린다. `flush()` 는 콜백이 돌려준 약속까지 기다리므로, 감사 기록이 중요하면 종료 순서에서 `flush()` 를 부른다. 운영 중에는 부르지 않는다 — 결과를 기다리던 콜백이 `decidedBy` 없이 불릴 수 있다.
- **메모리 축출(새 옵션, 옵트인).** `createChatHandler({ sessionIdleMs, maxSessions })` 로 오래 쓰지 않은 세션을 메모리에서 내보낼 수 있다. `history` 와 `side` 를 함께 준 핸들러에서만 쓸 수 있고, 아니면 만들 때 `TypeError` 다. 주지 않으면 지금과 같이 축출하지 않는다. 내보낸 세션은 다음 조회·턴이 재기동 뒤처럼 되살린다. 자세한 조건은 chat-server README 의 "메모리 축출".
- **되살린 ask 카드.** 시간 제한이 없다는 것을 문서에 적었다(동작은 그대로). 재기동·축출 뒤에도 답할 수 있고 답은 새 턴이다.
- **저장 재시도.** 다시 쓴 `history.save` 도 실패한 사이 새 확정이 오면 1초 뒤 최신 스냅샷으로 다시 쓴다. 전에는 다음 확정이나 `flush()` 까지 기다렸다. 다른 범위의 같은 세션 id 알림 기억은 오래 쓰지 않은 것부터 지운다. 소비자가 할 일은 없다.

### testing

- `makeEngine` 이 `close()` 를 함께 돌려준다(`transformToolArgs` 훅 소켓을 닫는다).
- `fakeSpawn`·`fakeCodexSpawn` 은 `close()` 뒤에 spawn 해도 던지지 않고 훅 소켓을 다시 연다.
- 훅 시한 env(`FAKE_CLAUDE_TOOL_ARGS_TIMEOUT_MS`·`FAKE_CODEX_TOOL_ARGS_TIMEOUT_MS`)가 양수가 아니면 기본 30초다. 훅을 주지 않으면 물려받은 이 값을 빈 값으로 덮는다.
- 계약 검사(`coreExtProblem`·`checkCoreExt`)가 `core.config` 의 `outer-session-stripped`(`vars`)를 안다. 전에는 이 알림을 `선언되지 않은 칸 vars` 로 실패시켰다.

---
