# agent-relay-engine 1.8.4 릴리스 노트

바뀐 범위: 1.8.3 → 1.8.4

### core

- **신호로 끊은 뒤에도 끝나지 않는 턴.** control 중지 대기 상한을 넘겨 신호로 끊고 프로세스를 내린 뒤에도 백엔드가 `termGraceMs` 안에 턴을 닫지 못하면, 엔진이 그 턴을 `interrupted{via:'signal'}` → `done(interrupted)` 로 강제로 닫는다(도구 상한 중지는 `error(budget)` → `done(budget)`, 강제 재시작은 그 `error`). `stop()` 결과·metric(`turn.interrupt{via:'signal'}`)은 1.8.3 과 같은 `'signal'` 이다. 1.8.3 은 그 턴의 스트림이 끝나지 않아 풀 자리(`gate`)·턴 문맥·세션 큐가 반환되지 않았다. 강제로 닫은 뒤 늦게 오는 출력은 버리고, 그 프로세스는 다시 쓰지 않는다. `stop()`·`evict()`·`dispose()` 는 이 경우 최대 `termGraceMs` 를 더 기다린다. 소비자가 할 일은 없다.
- **정리·중지 중인 턴에 끼워 넣기.** `mode:'inject'` 턴이 정리(`dispose()`·세션 정리) 중이거나 멈추는 중(중지·강제 재시작)인 턴에 닿으면 끼워 넣지 않는다. 정리된 세션이면 `error{reason:'disposed', resumable:true}`, 아니면 `injectFallback` 대로(`'turn'` 은 큐, `'reject'` 는 `error(busy)`) 간다. 1.8.3 은 백엔드 판정에 맡겨 닫히는 턴에 묶일 수 있었다.
- **`error(disposed)` 의 `resumable`(문서).** 값은 그대로다. 이미 정리된 엔진에 연 턴은 `false`, 기다리다 정리로 거둔 입력(기록 읽기·gate·큐 대기, 정리된 세션 큐)은 `true` 다 — 돌지 않은 입력이라 새 엔진·다시 연 세션에 그대로 보내도 된다. `ErrorReason` JSDoc 과 core README 에 적었다.
- **턴 끝을 받은 뒤의 신호 끊기.** 백엔드가 턴 끝을 이미 받아 닫는 중이면 `evict()`·`dispose()`·소비자 이탈의 신호 끊기는 프로세스만 내리고 중지로 세지 않는다 — metric `turn.interrupt` 를 남기지 않고 결과는 `'none'` 이다. 1.8.3 은 이벤트는 정상 끝인데 metric 은 `signal` 로 셌다.
- **`backend-kit`(experimental) 타입.** 직접 백엔드를 만드는 쪽만 해당한다. `ClosingRun` 의 `stopVia` 는 `'control' | 'signal'`, `fail` 은 `RunFailure` 로 좁혔고 `budgetStop?` 칸이 늘었다. `BaseRun` 에 선택 칸 `abandoned?`·`abandon?`·`stopAfterComplete?`·`sent?`(본 입력을 백엔드에 보냈다 — 켜면 `core.input` 전에 강제로 닫힌 턴도 실행된 입력으로 보고 `clientMessageId` 를 기억한다) 가, `TurnQueue` 에 `closed`, `TurnEnd` 에 `closeStopped()` 가, `LifecycleSession` 에 선택 칸 `cuts?`(수명 함수가 채우는 진행 중인 절단) 가 늘었다. 새 export 이름은 없다.
- **바로 신호로 끊는 경로의 강제 닫기.** `evict()`·`dispose()`·소비자 이탈·`stop({force:true})`·강제 재시작처럼 control 단계 없이 신호로 끊은 뒤에도 백엔드가 `termGraceMs` 안에 턴을 닫지 못하면(사용량 기록 저장이 멈춤 등) 같은 강제 닫기로 닫는다 — `interrupted{via:'signal'}` → `done(interrupted)`(강제 재시작은 그 `error`), 정리 한 번, 늦은 출력 버림. ask 로 이미 `done(ask)` 를 낸 턴은 더 낼 이벤트가 없어 중지로 세지 않는다. 턴 끝을 받아 닫는 중이던 턴도 그 끝을 내지 못하고 강제로 닫히면 `interrupted{via:'signal'}`·metric `turn.interrupt{via:'signal'}` 이다. 1.8.4 의 앞선 변경은 control 중지 대기 상한 뒤에만 강제로 닫아, 이 경로에서는 턴 스트림·풀 자리·세션 큐가 남아 그 세션이 막혔다. 신호로 끊는 턴 하나를 기다리는 시간은 최대 `termGraceMs × 3` 이다.
- **시작 전에 강제로 닫힌 턴의 `clientMessageId`.** 입력을 보내기 전(백엔드가 입력을 보내기 전이고 `core.input` 전)에 강제로 닫힌 턴은 실행되지 않은 입력이라 그 `clientMessageId` 를 기억하지 않는다 — 같은 id 로 다시 보내면 실행된다(시작 전에 거둔 입력의 규약과 같다). 백엔드가 끝내 끝나지 않으면 재전송이 `core.duplicate` 로 버려졌다.
- **`core.input` 을 읽기 전에 떠난 소비자의 `clientMessageId`.** 입력을 보냈는지는 소비자가 읽은 이벤트가 아니라 엔진이 낸 `core.input`·백엔드가 보낸 입력으로 판단한다. 1.8.3 은 소비자가 `core.input` 을 읽기 전에 떠나면 보낸 입력의 `clientMessageId` 도 잊어, 같은 id 의 재전송이 한 번 더 실행됐다.
- **ask 답 턴의 예외(문서).** 답 턴은 답을 기록한 뒤 입력을 보낸다. 그 사이에 끝나면 `clientMessageId` 는 잊히지만 같은 답의 재전송은 `error(ask-mismatch)` 다 — 모델이 다시 묻게 한다. 동작은 그대로다(core README `TurnInput`·ask 절).
- **진행 중인 절단과 `dispose()`·`restart()`.** `evict()`·소비자 이탈이 신호로 끊은 턴이 강제 닫기를 기다리는 사이 온 `dispose()`·세션 정리·`restart()` 는 그 턴이 닫힐 때까지 기다린다(최대 `termGraceMs × 3`). 앞의 변경만으로는 정리가 먼저 끝나 뒤늦은 강제 닫기가 정리된 엔진에서 이벤트·풀 자리 반환을 했다. 부를 때 도는 턴이 없던 `restart()` 는 기다리는 사이 시작된 다음 턴을 끊지 않는다.
- **직접 만든 백엔드의 강제 닫기 계약.** driver 는 첫 `await` 전에 `run.abandon` 을 두고, 그 안에서 턴 끝 정리를 한 번만 한다 — 끝 이벤트(`TurnEnd.closeStopped()`), `active` 정리, 세션 큐 넘기기(`queue.finish()`), 끼워 넣기 닫기. driver 의 `finally` 와 `abandon` 중 먼저 온 쪽만 정리해야 늦게 끝난 driver 가 다음 턴의 큐를 건드리지 않는다. 두지 않으면 소비자 스트림은 엔진이 닫지만 세션 큐는 그 driver 가 끝날 때까지 넘어가지 않는다.

### claude

- **control 중지의 result 처리 중 `evict()`·`dispose()`.** `stop()` 의 2단 중지로 CLI 가 턴을 닫는 result 를 받으면 사용량 기록 전에 `control` 로 표기한다(codex 가 `turn/completed{status:'interrupted'}` 를 받을 때와 같다). 도구 상한 중지(`perTurn.toolCalls`)의 result 는 표기하지 않고 1.8.3 과 같이 닫는다 — `turn.interrupt` metric 없음, `stop()` 은 `'none'`, 승인 취소 사유 `turn-ended`(codex 도 같다). 그 사이 온 `evict()`·`dispose()` 는 끊지 않고 그 끝(`interrupted{via:'control'}`)을 기다리고, 기록 저장이 멈추면 control 중지 대기 상한 뒤 신호로 끊어 강제로 닫는다. 1.8.3 은 그 사이 신호로 끊어 `interrupted{via:'signal'}` 이었고, 기록 저장이 멈추면 턴이 끝나지 않았다. 끼워 넣었다 다음 턴으로 밀린 입력으로 CLI 가 이어 시작한 턴은 중지 요청 뒤라 멈춘다.
- **그 사이의 `evict()` 와 프로세스.** control 중지의 result 처리 중 온 `evict()` 는 끊지 않고 기다린다. 이어받은 다음 턴이 control 로 멈추면 프로세스는 남고(그 턴이 이미 시작했으므로 `evict()` 는 내리지 않는다) 유휴 퇴출(`evictIdleMs`)이 내린다.
- **result 처리 중 신호 끊기.** 중지·도구 상한이 아닌 턴의 result 를 처리하는 사이(사용량 기록 대기) `evict()`·`dispose()` 가 끊으면, 결과를 받은 턴이라 `done(end_turn)`(또는 `no-tool-call`·`cli-error`)로 닫히고 metric `turn.interrupt` 는 남지 않는다. 1.8.3 은 `done(end_turn)` 인데 metric 은 `signal` 이었다. 프로세스는 내려가고 다음 턴에 넘기지 않는다(그대로). 그 사이의 `stop()` 은 `'none'` 이다 — 다만 끼워 넣었다 다음 턴으로 밀린 입력으로 CLI 가 이어 시작한 턴은 멈춘다(사람은 멈추길 원했다).
- 신호로 끊은 뒤 끝나지 않는 턴의 강제 닫기(core)를 따른다.
- **입력을 쓴 뒤 init 전에 끝난 턴의 `clientMessageId`.** 새로 띄운 CLI 에 입력을 쓴 뒤 init(`core.input`) 전에 끝나면 이제 그 `clientMessageId` 를 기억한다 — 같은 id 의 재전송은 `core.duplicate` 다. 1.8.3 은 잊어 CLI 가 이미 받은 입력이 다시 실행될 수 있었다. 입력을 쓰지 못했으면(프로세스가 죽음) 잊는다.
- **모델을 맞추는 중 강제로 닫힌 턴.** 입력 전 `set_model` 을 기다리는 사이 그 턴이 강제로 닫히면 늦은 응답으로 세션 모델을 고치지 않고, 그 프로세스는 다음 턴이 이어 쓰지 않고 새로 띄운다. 늦게 깨어난 옛 턴은 프로세스·턴 수를 건드리지 않는다. 강제로 닫히기 전에 응답이 와도 그 사이 신호로 끊겼으면 그 자리에서 프로세스를 내리고 `interrupted{via:'signal'}` 로 닫는다(입력을 쓰지 않아 턴 수도 세지 않는다). 앞의 변경만으로는 다음 턴이 쓰는 프로세스를 옛 턴이 내려 그 턴이 `error(exit)` 로 끝날 수 있었다.
- **control 중지의 result 가 토큰 상한을 넘김.** `stop()` 의 interrupt 를 CLI 가 받아들여 닫은 result 의 사용량이 `perTurn`·`perSession` 토큰·비용 상한을 넘겨도 중지로 닫는다 — `interrupted{via:'control'}` → `done(interrupted)`, `stop()` 은 `'control'`, metric `turn.interrupt{via:'control'}`, 승인 취소 사유 `stopped`. 프로세스는 1.8.3 처럼 내리고, 끼워 넣었다 다음 턴으로 밀린 입력으로 CLI 가 이어 시작한 턴은 넘기지 않는다(그 끼워 넣기는 닫힌다) — 상한을 넘긴 세션에서 그 턴이 돌지 않게. 닫힌 끼워 넣기의 입력으로 CLI 가 이미 다음 턴을 시작했을 수 있다(1.8.3 의 상한 경로와 같은 규약). 1.8.3 은 그 턴에서 프로세스를 내리고 `error(budget)` → `done(budget)` 이었고(이번 1.8.4 의 앞선 변경 뒤로는 metric·반환·취소 사유만 `control` 이라 어긋났다) codex 와 달랐다. 세션 상한을 넘었으면 다음 턴이 시작 전에 거부된다.

### codex

- 신호로 끊은 뒤 끝나지 않는 턴의 강제 닫기(core)를 따른다. `turn/completed` 를 받아 닫는 중 끊긴 턴도 받은 상태대로 닫히고 중지로 세지 않는다(core).
- **중지된 턴의 사용량 기록 중 중지 유예 초과.** `turn/completed{status:'interrupted'}` 를 받아 사용량을 기록하는 사이 2단 중지의 유예가 지나도 `stop()` 결과·metric·`interrupted.via` 가 모두 `'control'` 이다. 그 사이 `evict()`·`dispose()` 가 신호로 끊으면 셋 다 `'signal'` 이다. 1.8.3 은 이벤트는 `control` 인데 metric 은 `signal` 이었다.
- **띄우는 중 강제로 닫힌 턴.** app-server 의 기동 handshake 를 기다리는 사이 그 턴이 강제로 닫히면 그 프로세스는 다음 턴이 이어 쓰지 않고 내린 뒤 새로 띄운다. 앞의 변경만으로는 다음 턴이 준비 안 된 app-server 를 이어받고, 늦게 끝난 옛 턴이 그 프로세스를 내려 다음 턴이 `error(exit)` 로 끝날 수 있었다.
- control 중지로 끝난 턴(`turn/completed{status:'interrupted'}`)은 사용량이 토큰 상한을 넘겨도 `interrupted{via:'control'}` 로 닫는다(1.8.3 과 같다, claude 도 이제 같다). 테스트로 고정했다.
- app-server 를 띄우기 직전의 중지 재확인(1.8.3)에 소비자 이탈·시작 전 `stop()`·신호 끊기 테스트를 더했다(동작은 그대로).

### chat-server

- **범위 핸들러의 `GET /metrics`.** 접두어에 `:param` 이 있는(범위가 있는) 핸들러는 그 범위의 값만 낸다. 1.8.3 은 `counters` 와 `pool.dropped` 를 풀 전체 값으로 내, 한 범위의 사용자가 다른 범위의 활동량을 볼 수 있었다.
  - `counters` 는 그 범위 세션의 관측 이벤트만 센다. 범위를 찾지 못한 이벤트(메모리에서 내보낸 세션 등)는 세지 않고, 범위의 세션이 메모리에서 모두 사라지면 그 카운터는 지워질 수 있다.
  - `pool.dropped` 는 범위로 나눌 수 없어 범위 핸들러의 응답에서 빠진다. 응답은 `{counters, pool: {processes, sessions}}` 다. 이 칸을 읽던 화면은 범위가 없는 접두어의 핸들러를 운영자 전용 경로에 따로 붙이거나 `pool.snapshot()` 을 직접 읽는다.
  - 범위가 없는 핸들러는 그대로다(풀 전체 값, `dropped` 포함).
- **새 옵션 `metrics?: boolean`(기본 `true`).** `false` 면 `pool` 을 줘도 `GET /metrics` 를 처리하지 않고 다음 미들웨어로 넘긴다(`engine` 만 줬을 때와 같다). 선택 칸이라 할 일은 없다.
- **문서: `history.save` 는 더 새 스냅샷만 덮어쓰기.** 내보낸 세션의 남은 쓰기는 5초까지만 기다리므로, 늦게 끝난 옛 `save` 가 더 새 `save` 뒤에 커밋될 수 있다. 서버가 최신 스냅샷을 다시 쓰지만 `maxSessions` 로 다시 내보낸 세션은 다시 쓰지 못한다. 직접 짠 `save` 는 마지막 항목의 `seq`(`chat.items.at(-1)?.seq`, 빈 기록은 0)가 저장된 값보다 크거나 같을 때만 덮어쓰게 권한다(README "대화 기록 저장소"). 동작은 그대로다.

---
