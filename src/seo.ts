/** 검색엔진용 페이지 정보 — 앱(런타임)과 빌드(정적 HTML 생성)에서 함께 사용 */
export const SITE_ORIGIN = 'https://huicode.vercel.app'

export type PageSeo = {
  path: string
  title: string
  description: string
  /** JS 실행 전 HTML에 들어가는 소개 문구 */
  heading: string
  intro: string
}

export const HOME_SEO: PageSeo = {
  path: '/',
  title: '후이코드(huicode) — 우쿨렐레 코드 검색·조옮김',
  description:
    '우쿨렐레 코드 운지표를 바로 찾고, 원하는 키로 조옮김까지! 후이코드(huicode) 무료 우쿨렐레 코드 검색 사이트',
  heading: '후이코드(huicode) — 우쿨렐레 코드 찾기',
  intro:
    '루트음과 코드 타입을 고르면 우쿨렐레 코드 운지표를 바로 확인할 수 있어요. 원래 코드를 원하는 키로 바꾸는 조변환(조옮김)도 함께 제공합니다.',
}

export const TRANSPOSE_SEO: PageSeo = {
  path: '/transpose',
  title: '우쿨렐레 조변환(조옮김) — 후이코드(huicode)',
  description:
    '우쿨렐레 코드 진행을 원하는 키로 한번에 바꿔 주는 무료 조변환(조옮김) 도구, 후이코드(huicode)',
  heading: '우쿨렐레 조변환(조옮김)',
  intro:
    '원곡 키와 목표 키를 고르고 코드를 입력하면, 우쿨렐레 코드 진행을 원하는 키로 바로 바꿔 줍니다.',
}

/** '/finder'는 홈과 같은 화면이라 홈 정보를 사용 */
export function seoForPath(pathname: string): PageSeo {
  return pathname === TRANSPOSE_SEO.path ? TRANSPOSE_SEO : HOME_SEO
}
