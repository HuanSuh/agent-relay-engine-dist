# agent-relay-engine 1.8.14 릴리스 노트

바뀐 범위: 1.8.13 → 1.8.14

### core

- **`ask` 이벤트에 선택 칸 `expiresAt?: number`(epoch ms).** ask 도구 결과(`AskResult.expiresAt`)의 만료 시각을 `askEvent` 가 옮긴다 — Claude·Codex 두 백엔드가 같은 함수를 지난다. 결과에 없거나 유한한 숫자가 아니면 칸이 없다. 이 시각이 지나면 엔진이 답을 받지 않는다(`AnswerMismatchError`, 기본 TTL 60분).
- 영향: 칸이 늘기만 한다. `ask` 이벤트를 깊은 비교(`toEqual`)하던 테스트는 `expiresAt` 이 붙는다.
- 소비자 할 일: 없음. 질문 카드를 직접 그리면 이 시각으로 만료를 보인다.

### chat-server

- **ask 항목에 `expiresAt?`, 답 표시에 실제로 쓰인 답 `answers?`.** ask 항목이 엔진 이벤트의 `expiresAt` 을 싣는다. 엔진이 답 입력을 받으면 사람 글의 `answer` 와 ask 항목에 `answers: [{labels, other?}]`(질문 순서대로)를 남긴다. `core.input` 은 `askId` 만 실으므로 값은 같은 `askId` 로 서버가 받은 답 요청(`POST /chat`·`send` 의 `answer`)에서 가져온다 — 옛 모양 `labels`/`other` 는 질문 하나짜리로 정규화하고 `other` 의 앞뒤 공백을 지운다. `other` 는 답 요청 본문 상한(`MAX_BODY`)을 따르고 따로 자르지 않는다(같은 글이 답 글의 `text` 에도 있다). ask 항목은 `identify` 가 없어도 `answers` 로 답했음을 남긴다. 그 답 턴의 스트림이 아닌 곳(합쳐진 꼬리, 같은 질문을 답하는 다른 스트림)에서 값을 빌려 올 때는 언제나 보낸 사람 id 가 `core.input` 의 `answer.author` 와 같은 요청의 값만 쓴다. 묶음(`inputs`)·옛 기록은 칸이 없다.
- **`hello` 와 `GET /sessions/:id/chat` 응답에 서버 시각 `now`(epoch ms).** 클라이언트가 시계 차이를 재어 `expiresAt` 을 서버 시각으로 가르는 데 쓴다(PROTOCOL.md).
- 영향: 기록·SSE `chat`·`history` 스냅샷의 두 칸과 `hello`·기록 응답의 `now` 가 늘기만 한다. `hello` 나 기록 응답을 깊은 비교하던 테스트는 `now` 가 붙는다. 옛 스냅샷도 그대로 읽힌다. `authorizeAction` 의 "이미 답한 질문" 판정은 지금처럼 `decidedBy` 만 본다.
- 소비자 할 일: 없음. 기록을 따로 저장·검증하는 코드가 있으면 두 칸을 허용한다.

### chat-client

- **ask 카드 `phase` 에 `'expired'`·`'superseded'`.** 단계는 `open`·`sending`·`answered`·`expired`·`superseded` 다(README "ask 카드의 단계"). `expiresAt <= now` 인 카드(기록을 다시 그릴 때와 SSE 로 받을 때 모두)와 같은 세션에 뒤의 질문이 와서 '마지막 질문'이 아닌 카드는 `expired`, 답이 아닌 사람 글이 와서 닫힌 카드는 `superseded` 다. 화면에 있는 동안의 만료는 스토어가 다음 만료 시각에 타이머 하나로 처리한다. 사람 글의 `answer.answers`(또는 ask 칸의 `answers`)로 `answered` 카드의 `selected` 를 되살린다. 만료는 서버 시각으로 가른다 — 스토어가 `hello.now`·기록 응답의 `now` 로 시계 차이를 재어 더한다(옛 서버면 차이 0). `answerAsk` 는 만료가 지난 카드를 보내지 않고 `expired` 로 닫는다. 보낸 뒤 엔진이 `ask-mismatch` 로 거절하면 그 카드는 `answered` 가 아니라 `expired` 다(서버의 답 글이 오기 전의 `answered` 는 `unconfirmed:true`). 거절은 이 화면이 보낸 답 요청의 `clientMessageId` 로 맞춘다 — 다른 참여자의 거절로는 닫히지 않는다. 단, cmid 가 없는 거절(옛 서버, cmid 없이 보낸 답 요청)은 문구 끝의 `askId` 로 맞추므로 다른 참여자의 거절로도 닫힐 수 있고, 이 화면의 답이 실제로 받아들여졌으면 서버의 답 글이 오는 대로 `answered` 로 돌아온다. 보내지 못해 `open` 으로 되돌린 카드도 그 요청이 서버에 닿아 거절되면(같은 cmid) `expired` 로 닫는다. 끼워 넣기 글은 카드를 닫지 않고, 다른 질문의 답 글은 남은 열린 카드를 `expired` 로 닫는다. `ask` 알림(`onNotice`)은 지금 세션의 카드면 그 카드가 `open` 일 때만 보낸다(다른 세션의 질문은 그대로 알린다). `AskView` 에 `expiresAt?`·`unconfirmed?`·`sendingCmid?`·`lastCmid?`, 프로토콜 타입 `AskAnswerMark` 에 `answers?`, ask `ChatItem` 에 `expiresAt?`·`answers?`, `hello`·`SessionChatResponse` 에 `now?`, `LocalAction` 에 `local/ask-expire` 와 `local/ask` 의 `clientMessageId?`, `reduce` 에 세 번째 인자 `opts?: {now?}`.
- 영향:
  - **`phase` 에 새 값이 둘 생겼다 — 소비자 `switch`(ask 카드 단계)에 `expired`·`superseded` 갈래를 더해야 한다.** 다루지 않으면 닫힌 카드가 엉뚱한 모양(대개 열린 카드나 빈 모양)으로 그려진다. TypeScript 의 망라 검사(`never`)를 쓰면 컴파일에서 걸린다.
  - 일반 입력이 온 뒤의 카드는 1.8.13 까지 `answered` 였지만 이제 `superseded` 다. `phase === 'answered'` 로 "닫힘"을 판정하던 코드는 `phase !== 'open'` 으로 바꾼다.
  - 만료 시각이 지난 카드(서버 시각 기준)는 열리지 않고 보내지도 않으므로, 다음 날 카드를 눌러 `AnswerMismatchError` 를 받던 흔한 경우는 막힌다. 다만 만료 직전에 보낸 답, 다른 화면이 먼저 답했거나 마지막 질문이 바뀐 경우, 서버와 엔진 호스트의 시계가 다른 경우는 여전히 엔진이 거절할 수 있다 — 그때 카드는 `expired` 로 바뀌고 오류 칸이 남는다.
  - `answered` 가 잠정일 수 있다(`unconfirmed:true`). '답함' 표시를 서버 확인 뒤에만 보이려면 이 칸을 본다.
  - `ask` 알림은 받자마자 만료된 질문과 재생으로 다시 받은 칸에는 오지 않는다.
  - `reduce` 의 세 번째 인자가 객체라 `actions.reduce(reduce, s)` 는 컴파일 오류다 — `actions.reduce((s, a) => reduce(s, a), s0)` 로 고친다.
- 소비자 할 일: `phase` 를 다루는 `switch`·조건에 새 두 값을 더한다. 리듀서를 직접 쓰면 `reduce(s, a, { now })` 로 서버 시각을 넘기고, 다음 만료 시각에 `local/ask-expire` 를 보낸다. `Transport` 를 직접 짜서 다른 서버를 붙이면 `hello`·기록 응답에 `now` 를 실어야 시계 차이가 반영된다.

### chat-ui

- **닫힌 카드·답한 카드의 모양과 안내 라벨.** 카드가 `data-phase` 를 달고, `expired`·`superseded` 는 닫힌 모양에 안내 한 줄(`role="note"`, 기본 "시간이 지난 질문이에요. 채팅으로 다시 답해 주세요"), `answered` 는 고른 선택지를 켠 채 '답함' 표시와 기타 원문을 보인다. 열린 카드는 답하지 않은 질문에 띠를 그리고 남은 질문 수를 알린다. 닫힘·답함은 `aria-disabled="true"` 로도 알린다. 새 속성 `ask-expired-label`·`ask-superseded-label`·`ask-answered-label`·`ask-remaining-label`·`ask-input-placeholder`, 새 part `ask-answered`·`ask-other-answer`·`ask-note`.
- **단계별 클래스.** ask 카드는 단계 이름의 클래스(`sending`·`answered`·`expired`·`superseded`)만 단다. 1.8.13 까지는 열려 있지 않은 모든 카드(보내는 중 포함)에 `.answered` 가 붙었다.
- 영향: 답한 카드의 흐림이 옅어지고(0.6 → 0.85) 고른 선택지가 켜져 보인다. 일반 입력 뒤의 카드에 안내 줄이 붙는다. 호스트 CSS(`::part(card)` 와 함께 쓰던 `.answered` 선택자 등)나 테스트가 `.answered` 로 "닫힌 카드"를 고르던 경우, 보내는 중·만료·채팅으로 넘어간 카드는 더 이상 걸리지 않는다. `ask-input-placeholder` 를 주지 않으면 placeholder 는 그대로다(주면 보내는 중에도 유지).
- 소비자 할 일: 화면 문구에 맞게 다섯 라벨을 맞춘다 — 특히 `ask-input-placeholder` 로 질문이 열려 있는 동안 입력창 안내를 바꿀지 정한다. 다국어 화면이면 기본 한국어 문구를 바꾼다. `::part(card)` 로 흐림을 꾸몄으면 `[data-phase]` 별 모양을 확인하고, `.answered` 로 닫힌 카드를 고르던 선택자는 `[aria-disabled="true"]` 나 단계 클래스로 바꾼다.

---
