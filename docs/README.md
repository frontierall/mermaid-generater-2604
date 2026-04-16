# Docs

이 폴더는 `mermaid-generater-2604` 프로젝트의 구현 기능과 이슈 해결 내역을 정리하는 문서 모음입니다.

현재 문서는 코드베이스 실구현 기준으로 작성되었습니다. 특히 아래 자료를 근거로 사용했습니다.

- `index.html`
- `app.js`
- `styles.css`
- 세션 연속 기록 파일

현재 기준으로 남겨진 세션 연속 기록 파일:

- `2026-04-07-175450-this-session-is-being-continued-from-a-previous-c.txt`

## 문서 목록

- `feature-overview.md`: 현재 구현된 기능, 지원 다이어그램, 생성 파이프라인, 한계의 최신 정리
- `issue-history.md`: 코드에 반영된 주요 문제와 해결 내용의 종합 정리

## 권장 사용 방식

1. 기능이 추가되거나 제거되면 먼저 `feature-overview.md`를 갱신합니다.
2. 새로운 버그를 수정하면 `issue-history.md`에 같은 형식으로 추가합니다.
3. 재현 조건이 있으면 입력 예시와 실패 증상을 함께 남깁니다.
4. AI 프롬프트 수정만으로 해결한 경우와 코드 정규화로 해결한 경우를 구분해 적습니다.
