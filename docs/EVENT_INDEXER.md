# Event Indexer Documentation

> Goldsky Mirror + PostgreSQL + Prisma 기반 이벤트 인덱서

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Lumen Later BNPL                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stellar Testnet                                             │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐     YAML Config      ┌──────────────────┐  │
│  │  Goldsky    │ ─────────────────▶  │   PostgreSQL     │  │
│  │  Mirror     │   Real-time Stream   │   (Events)       │  │
│  └─────────────┘                      └──────────────────┘  │
│                                              │               │
│                                              ▼               │
│                                       ┌──────────────────┐  │
│  ┌─────────────┐                     │   Prisma ORM     │  │
│  │  MongoDB    │                     │   (Type-safe)    │  │
│  │  (App Data) │                     └──────────────────┘  │
│  └─────────────┘                            │               │
│       │                                      │               │
│       └──────────────┬───────────────────────┘               │
│                      ▼                                       │
│               ┌──────────────────┐                          │
│               │   Next.js API    │                          │
│               │   /api/indexer/* │                          │
│               └──────────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Setup Guide

### 1. PostgreSQL 설정

**옵션 A: Vercel Postgres (추천)**
```bash
# Vercel 대시보드에서 Storage > Create Database > Postgres
# POSTGRES_URL 자동 생성됨
```

**옵션 B: Supabase**
```bash
# supabase.com에서 프로젝트 생성
# Settings > Database > Connection string 복사
```

**옵션 C: 로컬 개발**
```bash
# Docker로 PostgreSQL 실행
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:15

# .env에 추가
POSTGRES_URL="postgresql://postgres:password@localhost:5432/lumenlater"
```

### 2. 환경변수 설정

`apps/web/.env`:
```env
# MongoDB (기존)
DATABASE_URL="mongodb://..."

# PostgreSQL (신규)
POSTGRES_URL="postgresql://..."
```

### 3. Prisma 클라이언트 생성

```bash
cd apps/web

# MongoDB 클라이언트 (기존)
npx prisma generate

# PostgreSQL 클라이언트 (신규)
npx prisma generate --schema=prisma/schema.postgres.prisma

# PostgreSQL 테이블 생성
npx prisma db push --schema=prisma/schema.postgres.prisma
```

### 4. Goldsky Pipeline 설정

```bash
# Goldsky CLI 설치
curl https://goldsky.com | sh

# 로그인
goldsky login

# DB Secret 등록 (POSTGRES_URL 사용)
goldsky secret create LUMEN_LATER_DB --value "$POSTGRES_URL"

# Pipeline 배포
goldsky pipeline apply ./indexer/pipeline.yaml

# Pipeline 시작
goldsky pipeline start lumen-later-events

# 상태 확인
goldsky pipeline status lumen-later-events
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/api/indexer/health
```

Response:
```json
{
  "status": "healthy",
  "checks": {
    "config": { "status": "pass", "message": "POSTGRES_URL configured" },
    "database": { "status": "pass", "message": "PostgreSQL connected via Prisma" }
  },
  "timestamp": "2025-12-12T10:00:00.000Z"
}
```

### Get Events
```bash
# 모든 이벤트 (페이징)
curl "http://localhost:3000/api/indexer/events?limit=50&offset=0"

# Contract별 필터
curl "http://localhost:3000/api/indexer/events?contractId=CC7KPNS..."

# 날짜 범위 필터
curl "http://localhost:3000/api/indexer/events?startDate=2025-01-01&endDate=2025-12-31"

# Transaction Hash로 조회
curl "http://localhost:3000/api/indexer/events?txHash=abc123..."
```

Response:
```json
{
  "events": [
    {
      "id": "...",
      "contractId": "CC7KPNS...",
      "contractName": "BNPL_CORE",
      "topic": ["bill_created"],
      "data": { "bill_id": 1, "amount": 1000 },
      "ledger": "123456",
      "txHash": "abc123...",
      "timestamp": "2025-12-12T10:00:00.000Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

### Get Statistics
```bash
curl http://localhost:3000/api/indexer/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalEvents": 150,
    "eventsByContract": {
      "BNPL_CORE": 80,
      "LP_TOKEN": 50,
      "USDC_TOKEN": 20
    },
    "latestLedger": "123456",
    "latestTimestamp": "2025-12-12T10:00:00.000Z"
  }
}
```

## Contract IDs

| Contract | Address | Events |
|----------|---------|--------|
| BNPL_CORE | `CC7KPNSQWP2FKOAXMDI7LN7FREPJNQM44QO4VAL5WDDCAV4OC2YDGOWY` | bill_created, bill_paid, bill_repaid, bill_liquidated |
| LP_TOKEN | `CDDIYSWIAPZALYJUT47YY33NTBYY6KXYXBMU6AY4KQ6FZJ7N3JCKPBEB` | deposit, withdraw, borrow, repay |
| USDC_TOKEN | `CBNOIIPYSYNBH477KUBOX5VRWUIW2PLDF4TE52GGYWRKSQM4BMD5GHK2` | transfer, mint, burn |

## Debugging

### 문제: "POSTGRES_URL not configured"
```bash
# .env 파일 확인
cat apps/web/.env | grep POSTGRES

# 환경변수 로드 확인
echo $POSTGRES_URL
```

### 문제: Prisma client not found
```bash
# PostgreSQL 클라이언트 재생성
cd apps/web
npx prisma generate --schema=prisma/schema.postgres.prisma
```

### 문제: 이벤트가 없음
```bash
# Goldsky pipeline 상태 확인
goldsky pipeline status lumen-later-events

# Pipeline 로그 확인
goldsky pipeline logs lumen-later-events

# 테스트넷 리셋 여부 확인 (3개월마다 리셋됨)
```

### 문제: DB 연결 실패
```bash
# PostgreSQL 연결 테스트
psql $POSTGRES_URL -c "SELECT 1"

# 테이블 확인
psql $POSTGRES_URL -c "\dt"
```

## Files

| File | Description |
|------|-------------|
| `indexer/pipeline.yaml` | Goldsky Mirror pipeline 설정 |
| `prisma/schema.postgres.prisma` | PostgreSQL Prisma 스키마 |
| `src/lib/prisma-postgres.ts` | PostgreSQL Prisma 클라이언트 |
| `src/services/event-indexer.service.ts` | 이벤트 조회 서비스 |
| `src/app/api/indexer/*/route.ts` | API 라우트 |

## Commands Reference

```bash
# Prisma 클라이언트 생성
npx prisma generate --schema=prisma/schema.postgres.prisma

# DB 스키마 푸시
npx prisma db push --schema=prisma/schema.postgres.prisma

# Prisma Studio (DB GUI)
npx prisma studio --schema=prisma/schema.postgres.prisma

# Goldsky Pipeline
goldsky pipeline apply ./indexer/pipeline.yaml
goldsky pipeline start lumen-later-events
goldsky pipeline stop lumen-later-events
goldsky pipeline status lumen-later-events
goldsky pipeline logs lumen-later-events
```

## References

- [Goldsky Docs](https://docs.goldsky.com)
- [Goldsky Stellar](https://docs.goldsky.com/chains/stellar)
- [Prisma Multi-Database](https://www.prisma.io/docs/guides/multiple-databases)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
