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
  - 대전 시작 → 매칭 대기 5초 → AI 상대 배정
  - 대국: 위에 상대(캐릭터, 급수, 아이디), 가운데 정사각형 오목판, 아래에 나
  - 한 수 12초 제한, 기권, 금수 표시, 착수 효과음, 결과 화면과 레이팅 변화

아직 없는 것: 실제 사람과의 매칭과 실시간 통신, 로그인, 서버 저장(지금은 브라우저 localStorage), 실제 랭킹.
지금의 "매칭"은 시간이 다 되면 무조건 AI가 들어오는 모의 동작입니다.

## 실행

```bash
pnpm install
pnpm dev          # 개발 서버
pnpm test         # 엔진, AI, 레이팅 테스트
pnpm build        # 웹 빌드
```

### Rust AI (packages/ai-rs)

AI 대국은 `packages/ai`를 Rust로 옮겨 WebAssembly로 컴파일한 `packages/ai-rs/omok_ai.wasm`을 쓴다.
같은 알고리즘이라 시간 제한이 없으면 TS AI와 같은 수를 두고(`parity.test.ts`), 30~45배 빨라서
같은 시간 안에 더 깊이 읽는다. wasm을 불러오지 못하면 TS AI로 둔다.

빌드된 `omok_ai.wasm`은 저장소에 커밋해 두므로 웹 빌드와 배포에는 Rust가 필요 없다.
AI를 고쳤다면 Rust로 다시 빌드한다. 고칠 때는 `packages/ai`(TS)와 `packages/ai-rs`(Rust)를 같이 고쳐야 비교 테스트가 통과한다.

```bash
rustup target add wasm32-unknown-unknown       # 처음 한 번
pnpm --filter @omok/ai-rs build:wasm           # omok_ai.wasm 다시 만들기
cargo test --manifest-path packages/ai-rs/Cargo.toml
BENCH=1 pnpm vitest run packages/ai-rs/src/bench.test.ts   # TS vs Rust 속도 비교
```

주소 끝에 `?match=3` 을 붙이면 매칭 대기를 3초로 줄여서 볼 수 있습니다.

## 구조

```
apps/web/          화면 (Vite + React + PixiJS)
packages/engine/   규칙, 승리와 금수 판정 (화면, 서버, AI가 같이 씀)
packages/ai/       AI 탐색과 난이도
packages/ai-rs/    같은 AI의 Rust 판 (WebAssembly). 브라우저 AI는 이걸 쓴다
packages/rating/   Glicko-2, 급수
```
