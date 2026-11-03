import { useEffect } from 'react'
import { SITE_ORIGIN, seoForPath } from '../seo'

function setMetaContent(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute('content', content)
}

/** 화면 이동 시 제목·설명·canonical을 페이지에 맞게 바꿈 (JS를 실행하는 검색엔진·공유용) */
export function usePageSeo(pathname: string) {
  useEffect(() => {
    const page = seoForPath(pathname)
    const url = `${SITE_ORIGIN}${page.path}`
    document.title = page.title
    setMetaContent('meta[name="description"]', page.description)
    setMetaContent('meta[property="og:title"]', page.title)
    setMetaContent('meta[property="og:description"]', page.description)
    setMetaContent('meta[property="og:url"]', url)
    setMetaContent('meta[name="twitter:title"]', page.title)
    setMetaContent('meta[name="twitter:description"]', page.description)
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
  }, [pathname])
}
