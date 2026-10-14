# 오목 (Omok)

사람 대 사람 실시간 오목 대전 게임. 매칭이 일정 시간 안 되면 AI가 상대합니다.
급수(18급 ~ 9단)와 랭킹이 있고, 모바일 세로 화면을 기준으로 한 웹앱(PWA 예정)입니다.

설계와 기술스택 검토: [docs/architecture.md](docs/architecture.md)

## 지금 되는 것 (서버 전 단계)

서버 없이 브라우저만으로 AI와 대국하는 단계까지입니다.

- 렌주룰 오목 엔진 (흑 3-3, 4-4, 장목 금지) — `packages/engine`
- 난이도 9단계 AI (패턴 평가 + 알파베타 탐색, 레이팅에 맞춰 선택) — `packages/ai`
- Glicko-2 레이팅과 18급 ~ 9단 급수표 — `packages/rating`
- 화면 — `apps/web` (React + PixiJS)
  - 홈(프로필, 캐릭터 선택, 급수), 임시 랭킹
  - 대전 시작 → 매칭 대기 15초 → AI 상대 배정
  - 대국: 위에 상대(캐릭터, 급수, 아이디), 가운데 정사각형 오목판, 아래에 나
  - 한 수 30초 제한, 기권, 금수 표시, 착수 효과음, 결과 화면과 레이팅 변화

아직 없는 것: 실제 사람과의 매칭과 실시간 통신, 로그인, 서버 저장(지금은 브라우저 localStorage), 실제 랭킹.
지금의 "매칭"은 시간이 다 되면 무조건 AI가 들어오는 모의 동작입니다.

## 실행

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm test         # 엔진, AI, 레이팅 테스트
pnpm build        # 웹 빌드
```

주소 끝에 `?match=3` 을 붙이면 매칭 대기를 3초로 줄여서 볼 수 있습니다.

## 구조

```
apps/web/          화면 (Vite + React + PixiJS)
packages/engine/   규칙, 승리와 금수 판정 (화면, 서버, AI가 같이 씀)
packages/ai/       AI 탐색과 난이도
packages/rating/   Glicko-2, 급수
```
