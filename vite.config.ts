import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { HOME_SEO, SITE_ORIGIN, TRANSPOSE_SEO, type PageSeo } from './src/seo.ts'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function staticBlock(page: PageSeo): string {
  return (
    `<!--seo-static--><div class="seo-static"><h1>${escapeHtml(page.heading)}</h1>` +
    `<p>${escapeHtml(page.intro)}</p>` +
    `<nav><a href="/">우쿨렐레 코드 찾기</a> · <a href="/transpose">우쿨렐레 조변환</a></nav></div><!--/seo-static-->`
  )
}

/** 빌드된 index.html(홈)에서 제목·설명·주소를 바꿔 페이지별 HTML 생성 — JS를 실행하지 않는 검색엔진용 */
function pageHtmlPlugin(pages: PageSeo[]): Plugin {
  let outDir = 'dist'
  return {
    name: 'huicode-page-html',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    writeBundle() {
      const homeHtml = readFileSync(join(outDir, 'index.html'), 'utf-8')
      for (const page of pages) {
        const swaps: [string, string][] = [
          [`<title>${HOME_SEO.title}</title>`, `<title>${escapeHtml(page.title)}</title>`],
          [`content="${HOME_SEO.title}"`, `content="${escapeHtml(page.title)}"`],
          [`content="${HOME_SEO.description}"`, `content="${escapeHtml(page.description)}"`],
          [`href="${SITE_ORIGIN}/"`, `href="${SITE_ORIGIN}${page.path}"`],
          [`property="og:url" content="${SITE_ORIGIN}/"`, `property="og:url" content="${SITE_ORIGIN}${page.path}"`],
        ]
        let html = homeHtml
        for (const [from, to] of swaps) {
          if (!html.includes(from)) throw new Error(`[huicode-page-html] index.html에서 찾지 못함: ${from}`)
          html = html.split(from).join(to)
        }
        const blockRe = /<!--seo-static-->[\s\S]*?<!--\/seo-static-->/
        if (!blockRe.test(html)) throw new Error('[huicode-page-html] seo-static 블록이 없음')
        html = html.replace(blockRe, staticBlock(page))
        writeFileSync(join(outDir, `${page.path.slice(1)}.html`), html)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), pageHtmlPlugin([TRANSPOSE_SEO])],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
