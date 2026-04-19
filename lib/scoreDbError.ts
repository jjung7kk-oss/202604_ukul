import { Prisma } from '@prisma/client'

/**
 * Prisma/DB 오류를 사용자에게 보여줄 짧은 한국어 메시지로 변환합니다.
 */
export function formatScoreDbError(e: unknown): string {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === 'P6001') {
      return 'Prisma 클라이언트가 Accelerate용(engine=none)으로 생성되어 일반 postgres URL과 맞지 않습니다. 프로젝트 루트에서 npx prisma generate(엔진 포함)를 실행한 뒤 API 서버를 다시 시작해 주세요.'
    }
    if (e.code === 'P2021') {
      return '악보 저장용 테이블이 DB에 없습니다. `npx prisma migrate deploy`(또는 `npm run db:migrate`)로 마이그레이션을 적용한 뒤 다시 시도해 주세요.'
    }
    if (e.code === 'P1001') {
      return '데이터베이스 서버에 연결할 수 없습니다. .env의 DATABASE_URL과 네트워크를 확인해 주세요.'
    }
    if (e.code === 'P1000') {
      return 'DB 인증에 실패했습니다. DATABASE_URL의 사용자·비밀번호를 확인해 주세요.'
    }
  }
  if (e instanceof Prisma.PrismaClientInitializationError) {
    return 'DB 연결 초기화에 실패했습니다. DATABASE_URL을 확인해 주세요.'
  }
  return '악보 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
}
