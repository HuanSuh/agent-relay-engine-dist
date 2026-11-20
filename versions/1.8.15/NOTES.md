# agent-relay-engine 1.8.15 릴리스 노트

바뀐 범위: 1.8.14 → 1.8.15

### chat-ui

- **입력창 placeholder 속성 `input-placeholder`(프로퍼티 `.inputPlaceholder`).** 열린 질문이 없을 때의 placeholder 다. 빈 값·공백뿐이면 기본 문구(`메시지를 입력하세요 (Enter 보내기, Shift+Enter 줄바꿈)`). 바꾸면 바로 반영되고 render 가 상태마다 다시 넣어도 이 값을 쓴다. 터치 기기에서는 Enter 안내를 뺀 문구를 줄 수 있다.
- **`ask-input-placeholder` 의 기본이 바뀌었다.** 주지 않으면 1.8.14 까지는 원래 문구였고, 이제는 `input-placeholder`(없으면 같은 기본 문구)다. 즉 질문 중 placeholder 의 기본은 일반 placeholder 다.
- **ask 카드 part 셋.** 선택지 버튼 `ask-option`(켜진 것은 `ask-option selected`), 기타 입력칸 `ask-other`, 카드의 [답 보내기] 버튼 `ask-send`. 기존 클래스·`data-selected`·동작은 그대로다. 터치 크기를 위한 변수 `--ce-ask-option-min-height`·`--ce-ask-other-min-height` 를 더했고 기본은 지정 없음(지금 크기)이다. `THEME_VARS` 에 두 이름이 늘었다.
- **`ask-reveal` 속성(`'bottom'`·`'top'`, 프로퍼티 `.askReveal`).** 기본 `bottom` 은 지금 동작이다. `top` 이면 새로 그려진 열린 질문 카드가 자동 따라가기로 들어올 때 카드가 스크롤 상자의 보이는 높이보다 크면 카드 위에 맞추고(작으면 바닥), `scroll-follow="never"`·따라가기가 풀린 상태에서는 움직이지 않는다. 처음 불러오기·세션 전환의 마지막 칸이 열린 질문 카드일 때도 같다. `top` 으로 맞춘 뒤에는 `scroll-follow="always"` 여도 그 자리를 지키며 따라가지 않는다. 그 카드가 열림(`open`·보내는 중)을 벗어날 때(답함·만료·넘어감), 이 화면에서 글을 보낼 때, 세션 전환, `ask-reveal`·`scroll-follow` 변경, 바닥에 닿을 때, "새 메시지" 버튼에서 풀린다. 같은 세션 재연결은 바닥에서의 거리로 되살린다(끊긴 사이 칸이 늘면 조금 어긋날 수 있다).
- **host 의 `data-ask-open`.** 열린(`open`)·보내는 중(`sending`) 질문 카드가 있으면 달리고 없으면 지워진다. `agent-relay-engine-chat[data-ask-open]::part(send)` 처럼 꾸밀 수 있다.
- 영향: 새 속성을 주지 않으면 기존 동작이 그대로다. 달라지는 것은 둘이다 — `input-placeholder` 를 주면 `ask-input-placeholder` 를 주지 않은 질문 중 placeholder 도 그 값을 따르고, host 에 `data-ask-open` 속성이 생긴다(호스트가 같은 이름으로 직접 달고 있었다면 엔진이 이 속성을 관리한다 — 둘이 같은 뜻이면 직접 다는 코드를 지운다).
- 소비자 할 일(선택): 휴대폰 화면이면 `input-placeholder` 로 Enter 안내를 뺀 문구를, `::part(ask-option)`·`::part(ask-send)`·두 변수로 44px 터치 영역을, 큰 질문 묶음이 오는 화면이면 `ask-reveal="top"` 을 준다. `data-ask-open` 을 스토어 구독으로 직접 달던 코드는 지운다.

---
