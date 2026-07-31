/**
 * 서버(api/, server/)에서만 import 하세요. Vite 클라이언트 번들에 넣지 마세요.
 * 배포 전 이 파일의 값을 실제 관리자 계정으로 바꾸세요.
 */
export const ADMIN_USERNAME = 'kjy'
export const ADMIN_PASSWORD = 'kjy0624!'

/** 세션 토큰 HMAC 서명용 비밀 문자열(충분히 긴 임의 문자열 권장) */
export const ADMIN_SESSION_SECRET = 'change-this-secret-for-hmac-signing'
