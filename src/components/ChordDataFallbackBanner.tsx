import type { ChordLibraryLoadInfo } from '../api/chordsApi'

type Props = {
  info: ChordLibraryLoadInfo
}

/**
 * API 대신 번들 코드표를 쓸 때만, 원인에 맞는 안내(잘못된 npm run dev 안내 방지)
 */
export function ChordDataFallbackBanner({ info }: Props) {
  if (info.source !== 'fallback') return null

  const f = info.failure
  const st = info.httpStatus

  if (f === 'network') {
    return (
      <p className="chord-finder__load-hint" role="status">
        {import.meta.env.DEV ? (
          <>
            API에 연결되지 않아 앱에 포함된 코드표를 사용 중입니다.{' '}
            <strong>
              <code>npm run dev:client</code>만 켜면 <code>/api</code>가 비어
              있습니다.
            </strong>{' '}
            터미널에서 <code>npm run dev</code>로 프론트(보통 5173)와 API 서버(4000)를
            함께 실행했는지 확인하세요.
          </>
        ) : (
          <>
            서버에 연결하지 못해 앱에 포함된 코드표를 사용 중입니다. 잠시 후
            다시 시도하거나 네트워크를 확인해 주세요.
          </>
        )}
      </p>
    )
  }

  if (f === 'not_found') {
    return (
      <p className="chord-finder__load-hint" role="status">
        <code>/api</code> 경로를 찾지 못했습니다(404). 로컬이면 Vite 프록시가{' '}
        <code>http://localhost:4000</code>으로 가는지, API 서버가 떠 있는지
        확인하세요.
      </p>
    )
  }

  if (f === 'http_error') {
    return (
      <p className="chord-finder__load-hint" role="status">
        {import.meta.env.DEV ? (
          <>
            API 서버는 응답했지만 오류입니다
            {st != null ? (
              <>
                {' '}
                (HTTP {st})
              </>
            ) : null}
            . 로컬이면 프로젝트 루트 <code>.env</code>의{' '}
            <code>DATABASE_URL</code>과 <code>npx prisma migrate dev</code>·
            <code>npm run db:seed</code>를 확인하세요. Vercel이면 해당 환경 변수와
            Functions 로그를 확인하세요.
          </>
        ) : (
          <>
            서버 오류(HTTP {st ?? '—'})로 번들 코드표를 사용 중입니다. DB·배포
            설정을 확인해 주세요.
          </>
        )}
      </p>
    )
  }

  return (
    <p className="chord-finder__load-hint" role="status">
      앱에 포함된 코드표를 사용 중입니다.
    </p>
  )
}
