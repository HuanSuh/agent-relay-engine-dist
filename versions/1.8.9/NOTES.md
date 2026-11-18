# agent-relay-engine 1.8.9 릴리스 노트

바뀐 범위: 1.8.8 → 1.8.9

### chat-server

- **error 항목·SSE 에 선택 칸 `why?`.** 엔진 error 의 `detail.why` 가 영문·숫자·`-`·`_` 로 된 64자 이하 문자열일 때만 싣는다. detail 의 나머지(도구 입력·경로 등)는 지금처럼 싣지 않는다. 칸이 늘기만 해 기존 소비자는 그대로다. 저장소에서 복원한 error 항목도 같은 모양 검사를 다시 거치고 알 수 없는 칸(`detail` 등)은 걷어 낸다. 미뤄 닫는 오류 항목에는 `why` 가 없다.

### chat-client

- **`why?` 를 보존한다.** `ChatItem`(error)·`ViewItem`(error)·`Status`(`turn-error`)에 선택 칸 `why?: string` 이 늘었다(받은 값도 같은 모양만 받는다). PROTOCOL.md 의 `error` 행에도 적었다.

### chat-ui

- **`errorLabel` 인자에 `why?: string`.** 같은 reason 안에서 사유가 갈리면(`error(config, detail.why:'unlisted-tool')` 등) 엔진 메시지 문구로 가르지 않고 `why` 로 문구를 고른다. 오류 칸·접힌 오류·상태줄 모두 받고, 없으면 칸이 없다. 기존 함수는 그대로 돈다.

### testing

- **가짜 Claude CLI 가 승인 요청(`controlRequest`, `can_use_tool`)의 도구 이름을 `init.tools` 에 싣는다.** 실제 CLI(2.1.326)가 승인을 묻는 도구를 init 에 싣는 것과 같다. 1.8.8 의 strict 에서는 가짜 CLI 의 `init.tools` 에 그 도구가 없어 MCP 도구 승인 요청이 목록 밖으로 거절돼, 테스트에 init 을 선언하는 턴을 덧붙여 피해야 했다 — 그 덧붙인 턴은 지워도 된다. 걸러내기는 tool_use 와 같다: 내장 이름은 `--tools`·`--disallowedTools` 를 따라(`--tools` 밖 내장은 싣지 않는다), MCP 이름은 서버 상태(`mcpStatus`)를 따라 실린다 — MCP 서버가 `--mcp-config` 로 설정돼 있는지는 따지지 않고, 시나리오에 나온 서버는 connected 로 본다. `controlRequest` 의 `allow`·`deny` 가지 안의 승인 요청도 모은다(가지 안 tool_use 는 기존처럼 싣지 않는다). `init.tools` 의 정확한 내용을 단언하던 소비자 테스트는 새로 실린 도구 때문에 바뀔 수 있다.
- **목록 밖 승인 요청을 시험하려면 끈다.** `fakeClaudeSpawn(…, { unlistedControl: true })`(env `FAKE_CLAUDE_UNLISTED_CONTROL=1`)면 모든 `controlRequest` 도구를 싣지 않고, 단계에 `unlisted: true` 를 주면 그 단계만 싣지 않는다. 목록 밖 승인 요청을 가정하던 테스트는 이 옵션을 명시한다. `controlRequest` 도구가 init 에 있다고 가정하지 않던 테스트는 할 일이 없다.

### claude

- **실패가 걸렸거나 내려가는 프로세스에 늦게 온 허용을 쓰지 않는다(동작 변경, 보안).** 1.8.8 은 목록 밖 도구 거절(strict)·init 의 내장 도구 위반·init·MCP strict 실패·허용되지 않은 인증 등으로 프로세스를 내리는 사이(`termGraceMs`), 그 전에 훅·카드로 가 있던 다른 승인 요청의 허용이 늦게 오면 CLI 에 그대로 썼다. 1.8.9 는 쓰기 직전에 거절로 바꾸고 `core.permission_decided{behavior:'deny', via:'policy'}` 로 알린다. 목록 밖 도구로 건 실패이고 턴이 열려 있으면 `core.permission_denied{reason:'unlisted-tool'}` 도 온다. 그 턴은 1.8.8 과 같게 실패로 닫히므로 소비자가 할 일은 없다 — 그 카드에 허용으로 답했는데 결정이 `policy` 거절로 오는 경우가 새로 생긴다. 실패를 걸거나 내리기 전에 이미 쓴 허용은 되돌리지 못한다.
- **strict 의 목록 밖 tool_use 도 프로세스에 실패를 건다(보안).** 1.8.8 은 목록 밖 tool_use 로 프로세스를 내릴 때 실패를 걸지 않아, 같은 메시지의 다른 호출이나 그 뒤 승인 요청 가운데 목록 안 도구가 훅·기억한 규칙·사전 승인으로 허용되면 내려가는 사이 CLI 에 허용이 쓰였다. 1.8.9 는 승인 요청 경로와 같게 실패를 걸어 이후 승인 요청을 모두 거절한다. 턴의 모양(`error(config, why:'unlisted-tool')`)은 같다.
- **같은 턴이 건 목록 밖 실패도 `started` 뒤에 닫는다(고침).** 1.8.8 의 strict 에서 새 프로세스의 첫 init 과 같은 청크로 목록 밖 승인 요청이 오면 그 턴이 `started` 없이 `error` 로 닫힐 수 있었다(core 계약 '실행된 턴은 started 로 시작'과 어긋남). 1.8.9 는 늘 `started … core.permission_denied … error → done` 이다. `started` 없는 error 를 따로 다루던 코드는 그대로 둬도 된다.
- **문자열이 아닌 `tool_name` 의 승인 요청(동작 변경).** 1.8.8 은 `can_use_tool` 의 `tool_name` 이 문자열이 아니면 목록 밖 도구 대조를 건너뛰고 훅·기억한 규칙·사전 승인·카드로 보냈다. 1.8.9 의 strict(`builtinTools` 가 `'none'`·`'verified'`·`{allow}` + `builtinToolsCheck:'strict'`)는 목록 밖과 같게 먼저 거절하고 프로세스를 내린 뒤 `error(reason:'config', detail:{why:'unlisted-tool', tool:'(문자열 아님)', hallucinated:true})` 로 닫는다. 그 밖이면(실패가 걸리지 않은 프로세스) 기억한 규칙·사전 승인을 건너뛰고 카드로 묻는다(`'unknown'` 이름의 규칙·사전 승인과 맞춰지지 않게). metric `tool.unlisted{outcome:'warned', hallucinated:'true'}` 도 새로 센다. `detail.tool` 을 도구 이름으로 쓰던 코드는 이 표지를 받게 둔다.

---
