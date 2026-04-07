# 이슈 및 해결 내역

이 문서는 현재 코드에 반영된 수정 흔적을 기준으로, 프로젝트에서 실제로 부딪힌 것으로 확인되는 문제와 해결 방식을 정리한 문서입니다.

주의:

- 일부 항목은 세션 기록 파일에 직접 상세히 남아 있지 않습니다.
- 그런 항목은 `app.js`의 주석, 정규화 로직, 프롬프트 제약을 근거로 재구성했습니다.
- 즉, 아래 내용은 "현재 코드에 반영된 실제 이슈 히스토리"에 가깝고, Git 커밋 기준 공식 변경로그는 아닙니다.

## 1. Mermaid 렌더링 오류가 자주 발생하던 문제

증상:

- AI가 Mermaid 코드를 생성했지만 렌더링 단계에서 파서 오류가 발생함
- 사용자는 결과 대신 실패 메시지를 보거나 코드 탭에서만 내용을 확인해야 했음

원인:

- Mermaid 문법이 타입별로 꽤 엄격한데, LLM 출력이 이 제약을 자주 어김
- 특히 `sequence`, `stateDiagram`, `requirementDiagram`, `quadrantChart` 계열에서 문법 민감도가 높았음

해결:

- 1차로 타입별 `STRICT RULES`를 프롬프트에 명시함
- 2차로 렌더링 실패 시 AI에게 문법 수정만 다시 수행하도록 자동 복구 로직을 추가함
- 3차로 일부 타입은 후처리 정규화 함수로 강제 보정함

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `buildPrompt`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `renderDiagram`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `fixMermaidCode`

재발 방지 포인트:

- Mermaid는 "AI가 대충 맞춰주는 문법"이 아니라 "타입별 엄격 문법"으로 취급해야 함
- 생성 프롬프트와 후처리 로직을 같이 가져가야 안정성이 나옴

## 2. Sequence Diagram에서 한국어 alias 때문에 렉서가 깨지는 문제

증상:

- `sequenceDiagram` 생성 후 이후 줄 전체가 비정상적으로 토큰화됨
- 참여자 선언 이후 메시지 줄들이 한꺼번에 깨지거나 문법 오류가 연쇄적으로 발생함

원인:

- Mermaid 시퀀스 다이어그램에서 참여자 alias에 한국어를 직접 넣으면 렉서가 깨지는 경우가 있었음
- 예: `participant U as "사용자"` 형태가 이후 구문 해석을 오염시킴

해결:

- 참여자 이름은 단일 영문 단어만 사용하도록 강하게 제한
- 한국어는 메시지 텍스트와 노트 텍스트에서만 허용
- 관련 규칙을 프롬프트에 명시

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `colorGuides.sequence`

재발 방지 포인트:

- `participant`, `actor`, 상태 이름, 클래스 이름처럼 토큰 역할을 하는 부분은 영어로 제한하는 것이 안전함

## 3. 곱슬따옴표 때문에 Mermaid가 문자열 종료를 인식하지 못하는 문제

증상:

- 겉보기에는 정상처럼 보이는 코드가 Mermaid에서 갑자기 깨짐
- 이후 여러 줄이 하나의 문자열처럼 해석되어 연쇄 오류가 발생함

원인:

- AI가 ASCII 따옴표(`"`) 대신 타이포그래픽 따옴표(`“ ”`, `‘ ’`)를 생성함
- Mermaid 렉서는 이를 표준 문자열 구분자로 처리하지 못함

해결:

- 렌더링 직전 모든 코드에 대해 곱슬따옴표를 ASCII 따옴표로 정규화
- 단일 따옴표 계열의 변형 문자도 함께 정리

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `sanitizeFancyQuotes`

재발 방지 포인트:

- LLM 출력은 보이는 문자와 실제 코드 포인트가 다를 수 있음
- Mermaid, JSON, YAML, Markdown fence 주변은 출력 정규화 계층이 필요함

## 4. Requirement Diagram에서 element 블록이 중첩되어 파싱 실패하는 문제

증상:

- `requirementDiagram` 렌더링 시 Mermaid 파서가 `ELEMENT` 관련 오류를 냄
- 요구사항 블록 안에 또 다른 `element` 블록이 들어간 경우 실패함

원인:

- AI가 다음과 같은 잘못된 구조를 생성함
- `requirement { ... element { ... } }`
- Mermaid 공식 스펙상 블록은 최상위 레벨에 있어야 하며 중첩이 허용되지 않음

해결:

- `requirementDiagram` 전용 엄격 규칙을 프롬프트에 추가
- 렌더링 전 정규화 단계에서 중첩된 `element` 블록을 탐지해 최상위로 추출

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `colorGuides.requirementDiagram`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `extractNestedElementBlocks`

재발 방지 포인트:

- Mermaid 공식 스펙이 복잡한 타입은 "생성 후 렌더링"만으로는 부족함
- 구조 검증 또는 타입 전용 정규화가 필요함

## 5. Requirement Diagram 속성 문법이 들쭉날쭉해지는 문제

증상:

- `id`, `text`, `risk`, `verifymethod`, `type`, `docref`가 콜론 없이 생성되거나
- 한 줄에 여러 속성이 붙거나
- 값의 대소문자/인용부호 규칙이 맞지 않아 파싱이 실패함

원인:

- LLM이 YAML 비슷한 형식, 자연어 형식, Mermaid 형식을 섞어서 출력함
- `risk`, `verifymethod`는 허용 값 집합이 정해져 있는데 이 규칙을 자주 벗어남
- `docref`에 하이픈이나 공백이 있으면 토큰 충돌이 발생할 수 있음

해결:

- 속성마다 콜론 형식 강제
- `text`는 큰따옴표 강제
- `risk`와 `verifymethod`는 허용 enum으로 보정
- `type`, `docref`는 특수문자가 있으면 큰따옴표로 감쌈
- 헤더가 없으면 `requirementDiagram` 헤더를 자동 추가
- 중괄호 짝이 맞지 않으면 자동 보정

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `normalizeMermaidCode`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `balanceRequirementBlocks`

재발 방지 포인트:

- 단순 프롬프트 튜닝만으로는 안정화가 어렵고, 후처리 정규화가 사실상 필수임

## 6. Quadrant Chart에서 축 선언과 키워드 줄바꿈이 깨지는 문제

증상:

- `quadrantChart`가 렌더링되지 않거나 축 선언이 잘못 해석됨
- `x-axis`, `y-axis`, `quadrant-*`, `title`이 한 줄에 붙어 나오는 경우 실패함

원인:

- AI가 여러 지시어를 한 줄에 합쳐서 출력함
- `x-axis A, B`처럼 쉼표 기반으로 출력해 Mermaid 기대 문법과 어긋남

해결:

- `quadrantChart` 전용 엄격 문법 규칙을 프롬프트에 추가
- 후처리 단계에서
  - 여러 키워드가 한 줄에 붙은 경우 분리
  - 쉼표 구문을 `-->` 구문으로 변환

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `colorGuides.quadrantChart`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `normalizeQuadrantChart`

재발 방지 포인트:

- 문법이 짧아 보이는 다이어그램 타입도 줄 단위 제약이 있는 경우가 많음
- "한 줄에 하나의 directive" 원칙을 프롬프트에 계속 유지해야 함

## 7. OpenAI 모델에서 requirementDiagram 문법 이탈이 더 잦은 문제

증상:

- 동일한 프롬프트라도 OpenAI 모델에서 블록 문법, 콜론, 문자열 인용 규칙이 더 흔들리는 경우가 있었던 것으로 보임

원인:

- 모델별 출력 습관 차이
- 특히 중괄호 블록 내부 속성 표기 방식이 Mermaid 스펙 대신 자연어 포맷으로 섞일 수 있음

해결:

- OpenAI 선택 시 추가 `STRICT SYNTAX ENFORCEMENT` 지시문을 프롬프트에 삽입
- 블록 내부 속성 표기를 더 강하게 통제

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `buildPrompt`

재발 방지 포인트:

- 멀티 모델 지원에서는 공통 프롬프트만으로 끝내지 말고 모델별 보정 규칙이 필요함

## 8. 병렬 생성은 편리하지만 부분 실패가 전체 실패처럼 보일 수 있는 문제

증상:

- 여러 다이어그램을 동시에 생성할 때 일부만 실패할 수 있음
- 사용자 경험상 "전체가 망가졌다"처럼 느껴질 여지가 있음

원인:

- 타입별 Mermaid 문법 난이도가 다르고, 같은 원문에서도 실패율이 다름

해결:

- `Promise.allSettled`를 사용해 개별 결과를 분리 처리
- 실패한 타입만 개별 에러를 보여주고 성공한 결과는 그대로 렌더링

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `generateDiagram`

재발 방지 포인트:

- 병렬 생성 기능은 반드시 부분 성공을 허용하는 구조로 유지해야 함

## 9. 브라우저 직접 API 호출 구조의 보안 리스크

증상:

- 기능은 간단하지만 API Key를 브라우저에 직접 넣고 외부 API로 호출해야 함

원인:

- 서버 프록시 없이 순수 프런트엔드 구조로 설계됨
- Anthropic 호출 시 브라우저 직접 접근 허용 헤더까지 사용 중임

해결:

- 현재는 사용자에게 저장 옵션을 분리해 제공하고, 메모리 저장/로컬 저장을 명시적으로 선택하게 함
- 상태 문구로 저장 위치를 안내함

한계:

- 이건 완전한 해결이 아니라 운영상 타협에 가까움
- 장기적으로는 서버 프록시 또는 서버리스 함수로 키를 브라우저에서 숨기는 구조가 더 적절함

코드 근거:

- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `onSaveLocalToggle`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `saveApiKey`
- `/mnt/d/Github_Frontierall/mermaid-generater-2604/app.js` 의 `callAI`

## 10. 유지보수 관점에서 로직이 단일 파일에 과밀한 문제

증상:

- 기능은 늘어났지만 `app.js`에 상태 관리, API 호출, 프롬프트 생성, 정규화, 렌더링, UI 제어가 모두 집중됨

원인:

- 빠르게 기능을 확장하면서 단일 파일 방식이 유지됨

현재 상태:

- 동작은 되지만, 신규 이슈가 생길수록 수정 범위가 넓어질 가능성이 큼
- 특히 Mermaid 타입별 예외 규칙이 계속 늘어나면 함수 간 결합도가 더 높아짐

권장 해결:

- `providers`
- `prompt-rules`
- `normalizers`
- `renderer`
- `ui-state`

같은 단위로 파일을 분리하는 것이 좋음

## 정리

이 프로젝트의 핵심 학습은 다음과 같습니다.

1. Mermaid 생성은 "AI 생성"보다 "문법 안정화 파이프라인"이 더 중요합니다.
2. 타입별 프롬프트 규칙과 후처리 정규화는 같이 가야 합니다.
3. `requirementDiagram`, `quadrantChart`, `sequenceDiagram`은 별도 관리 대상입니다.
4. 브라우저 직접 API 호출 구조는 빠르지만 장기 운영에는 보안상 한계가 있습니다.
5. 앞으로의 품질 개선은 프롬프트 개선보다 정규화/검증 모듈화가 더 큰 효과를 낼 가능성이 높습니다.
