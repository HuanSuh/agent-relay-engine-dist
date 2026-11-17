# agent-relay-engine 1.8.3 릴리스 노트

바뀐 범위: 1.8.2 → 1.8.3

### core

- **control 중지 대기 상한.** 백엔드가 control 중지로 턴을 닫는 중일 때 `stop()`·`evict()`·`dispose()`·소비자 이탈이 그 끝을 기다리는 시간에 상한(`interruptGraceMs + termGraceMs × 3`)을 둔다. 1.8.2 는 상한 없이 기다려, 백엔드가 끝을 내지 못하면 중지·정리가 영원히 끝나지 않았다. 상한을 넘기면 신호(SIGTERM → SIGKILL)로 끊고 `stop()` 결과·metric(`turn.interrupt{via}`)·`interrupted.via` 를 `'signal'` 로 맞춘다. 상한 안에 끝나는 경우의 동작·표기는 그대로다. 새 옵션은 없다.
- **`evict()` 와 다음 턴.** `evict()` 가 도는 턴의 중지를 기다리는 사이 다음 턴이 시작되면(같은 프로세스를 이어 쓰는 턴 포함) 프로세스를 내리지 않는다. 1.8.2 는 그 다음 턴의 프로세스를 내려 턴이 끊길 수 있었다. 소비자가 할 일은 없다.
- **`dispose()` 와 이어받은 턴.** `dispose()`(와 `consult` 의 분기 세션 정리)가 도는 턴의 control 중지를 기다리는 사이 다음 턴이 같은 프로세스를 이어받으면, 그 턴도 멈춘 뒤 프로세스를 한 번 내린다. 그 턴은 정리 때의 다른 시작된 턴과 같이 `interrupted{via:'signal'}` → `done(interrupted)` 로 끝난다(승인 카드는 `cancelled{reason:'disposed'}`). 1.8.2 는 그 턴을 멈추지 않고 프로세스만 내려, 턴이 `error{reason:'exit'}` 로 끝나고 metric 은 `turn.interrupt{via:'signal'}` 로 어긋날 수 있었다. 소비자가 할 일은 없다.
- **정리 중인 세션의 새 턴.** 세션을 정리하는 동안(`consult` 의 분기 세션 정리 등) 같은 id 로 들어온 `turn()` 은 큐에 들지 않고 `started` 없이 `error{reason:'disposed', resumable:true}` → `done(error)` 로 닫힌다. 1.8.2 는 그 턴이 큐에 들어 정리 뒤에 새 프로세스를 띄울 수 있었고, 그 프로세스는 엔진 `dispose()` 도 거두지 못했다. 정리가 끝난 뒤의 같은 id 는 새 세션으로 받는다.

### claude

- **입력 전 control 중지와 신호 끊기.** 2단 중지가 interrupt 를 보낸 뒤 입력을 쓰기 직전에, `dispose()`·`evict()` 가 먼저 신호로 끊었으면 그 턴의 `interrupted.via` 는 `'signal'` 이다. 1.8.2 는 드물게 `'control'` 로 덮어 metric(`turn.interrupt{via:'signal'}`)과 어긋났다. 소비자가 할 일은 없다.
- **control 중지의 끝과 신호 끊기.** 2단 중지로 CLI 가 턴을 닫는 result 를 처리하는 사이 `evict()`·`dispose()` 가 신호로 끊으면 `interrupted.via` 는 `'signal'` 하나이고, 끼워 넣었다 다음 턴으로 밀린 입력은 내려가는 프로세스에서 새 턴이 되지 않고 `error{reason:'stopped', resumable:true}` 로 닫힌다. 1.8.2 는 `interrupted{via:'control'}` 를 내 metric 이 `signal`·`control` 둘로 남고, 밀린 입력이 끊긴 프로세스에서 시작해 `error{reason:'exit'}` 로 끝날 수 있었다.
- **정리 직후의 새 프로세스.** 이전 프로세스가 내려가기를 기다리던 턴은 띄우기 직전에 `dispose()`·중지를 다시 본다. 그렇다면 CLI 를 띄우지 않고 `error{reason:'disposed', resumable:true}`(dispose)·`error{reason:'stopped'}`(시작 전 `stop()`)·`interrupted{via}`(신호로 끊긴 턴)로 닫는다. 1.8.2 는 `dispose()` 가 끝난 뒤 아무도 내리지 않는 CLI 프로세스가 잠깐 뜰 수 있었다.

### codex

- **정리 직후의 새 프로세스.** 이전 프로세스가 내려가기(와 격리 홈 준비)를 기다리던 턴은 app-server 를 띄우기 직전에 `dispose()`·중지를 다시 본다. 그렇다면 띄우지 않고 기존 규약(`error(disposed)`·`error(stopped)`·`interrupted{via}`)으로 닫는다. 1.8.2 는 `dispose()` 가 끝난 뒤 app-server 가 떴다가 그 턴이 내렸다. 소비자가 할 일은 없다.
- **입력 전 `dispose()` 로 닫는 턴의 `resumable`.** 입력을 보내기 전에 정리로 닫는 턴의 `error{reason:'disposed'}` 가 `resumable:true` 다(core 의 시작 전 턴·claude 와 같다). 1.8.2 는 `false` 였다. 소비자가 떠난(signal abort) 턴도 app-server 를 띄우기 직전에 보고 띄우지 않는다.

### chat-server

- **같은 id 의 남은 쓰기 대기에 상한.** 메모리에서 내보낸 세션의 `history.save` 가 끝나지 않은 채 같은 id 를 되살리면, `load` 와 새 기록의 첫 `save` 는 그 쓰기를 5초까지만 기다린다. 전에는 저장소가 응답하지 않으면 그 세션의 조회·턴·저장이 끝없이 매달렸다. 넘으면 `onError`(없으면 `process.emitWarning`)로 알리고 넘어간다. 조회의 `load` 는 읽지 못한 것(`load` 가 던진 것과 같다 — 404)으로 본다. 턴이 여는 세션은 저장하지 않다가 옛 쓰기가 끝나면 한 번 다시 읽어 저장된 기록 뒤에 그 사이 받은 턴을 이어 붙이고(그 항목들의 `seq` 가 뒤로 밀린다) 다시 저장한다. `save` 쪽은 먼저 쓰고, 옛 쓰기가 늦게 끝나면 최신 스냅샷을 다시 써서 옛 기록이 새 기록을 덮은 채 남지 않게 한다. 그 다시 쓰기를 기다리는 세션은 `maxSessions` 를 넘지 않는 한 축출하지 않고, 넘으면 경고 뒤 내보낸다. 소비자가 할 일은 없다.
- **`GET /metrics` 의 `pool.processes`.** 접두어에 `:param` 이 있는(범위가 있는) 핸들러는 그 범위에 보이는 세션 중 프로세스가 있는 수를 낸다 — 다른 범위의 프로세스 수를 알리지 않게. 범위가 없는 핸들러는 지금처럼 풀 전체 값이다. `counters`·`pool.dropped` 는 범위로 거를 수 없어 늘 풀 전체 값임을 README 에 적었다. 응답 모양은 그대로다.
- **문서.** 쓰는 중인 세션은 축출하지 않아 `maxSessions` 를 잠시 넘을 수 있음을 README "메모리 축출" 에 적었다(동작은 그대로).
- **합친 기록 알림.** 위처럼 늦게 읽은 기록과 그 사이 받은 턴을 합치면 `reload:true` 칸을 더한 `session` 이벤트를 보낸다(추가 칸). 직접 짠 클라이언트는 이 칸을 보면 그 세션 기록을 다시 읽는다.

### chat-client

- 열린 세션에 `reload:true` 인 `session` 이벤트가 오면 기록을 다시 읽는다. 그때 그 세션의 `seq` 에 묶인 상태 중 보낸 말풍선 자리와 접힌 오류는 비우고 말풍선은 다시 읽은 기록 끝에 둔다. 실패 칸이 소비한 오류 순번은 다시 읽은 기록에서 그 cmid 의 n 번째 오류 순번(n 은 칸이 소비한 오류 수, 새 칸 `consumedErrors`)으로 다시 맞춘다 — 재시도 칸이 옛 오류로 다시 실패하지 않고, 재시도 자신의 오류로는 실패하게. 소비자가 할 일은 없다.

---
