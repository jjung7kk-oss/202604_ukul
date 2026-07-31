---
name: 후이코드 프로젝트 구조
description: Vercel(npm 단일 프로젝트) + Replit artifacts 공존 구조. shared/ 역할, 이전 lib/ 충돌 이유.
---

## 구조 개요

루트에 원래의 npm 단일 프로젝트를 복원하고, Replit artifacts는 그대로 유지.

```
/                     ← npm 단일 프로젝트 (Vercel 배포 대상)
├── src/              ← React frontend (Vite)
├── api/              ← Vercel serverless functions
│   ├── auth/login.ts
│   ├── chords/library.ts
│   ├── chords/detail.ts
│   ├── chord-types/index.ts   ← NEW (ChordType CRUD)
│   ├── scores/index.ts
│   ├── scores/[id].ts         ← NEW (DELETE)
│   └── health.ts
├── shared/           ← 서버 공통 코드 (원래 lib/ 역할)
│   ├── adminAuth.ts
│   ├── adminCredentials.ts
│   ├── db.ts
│   ├── chordService.ts        ← ChordType 지원 추가
│   ├── scoreService.ts        ← deleteScore 추가
│   └── scoreDbError.ts
├── server/index.ts   ← Express dev server
├── prisma/
│   ├── schema.prisma          ← ChordType 모델 포함
│   └── migrations/
├── package.json      ← npm (원래 버전, preinstall guard 없음)
├── vercel.json
├── vite.config.ts
└── artifacts/        ← Replit 개발용 (별도 pnpm workspace 해제됨)
    ├── huicode/      ← 자체 node_modules 있어서 계속 동작
    └── api-server/
```

## 왜 lib/ 대신 shared/ 인가

루트 `lib/` 디렉토리에 Replit workspace 패키지들(api-client-react, api-spec, api-zod, db/)이 있어서, 원래 프로젝트의 `lib/db.ts`와 `lib/db/` 폴더가 충돌. `shared/`로 이름 변경해서 해결.

모든 `api/*.ts` import는 `../../shared/`, `server/index.ts`는 `../shared/` 사용.

## Vercel 빌드 체인 (검증 완료)

```
prisma generate && prisma migrate deploy && npm run build
```
- `npm install` → 434 packages (✓)
- `npx prisma generate` → ChordType 포함 client 생성 (✓)
- `npm run build` → `tsc -b && vite build` → 54 modules (✓)

## pnpm workspace 제거 내용

- `pnpm-workspace.yaml` 삭제
- `.npmrc` 삭제
- `tsconfig.base.json` 삭제
- `pnpm-lock.yaml` 삭제
- 루트 `package.json` → 원래 npm 버전으로 복원

**Why:** Vercel이 npm으로 `npm install` 실행 시 pnpm workspace root의 `preinstall` 스크립트가 비-pnpm 호출을 차단 → `prisma: command not found` 에러 발생.

## 신규 기능 (Replit에서 구현한 것들)

- ChordType 모델 (DB 기반 코드 타입 관리)
- `shared/chordService.ts`: getChordTypes, createChordType, seedChordTypesIfEmpty, 동적 library
- `shared/scoreService.ts`: deleteScore
- `api/chord-types/index.ts`: GET(공개)/POST(관리자)
- `api/scores/[id].ts`: DELETE
- `src/` 전체 frontend 업데이트 (artifacts/huicode/src/ 기준)
