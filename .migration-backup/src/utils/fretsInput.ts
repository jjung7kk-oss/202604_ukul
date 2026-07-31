/** G,C,E,A 순서 쉼표 입력 → frets. 0~15, 정확히 4개. */
export function parseFretsInput(input: string):
  | { ok: true; frets: [number, number, number, number] }
  | { ok: false; message: string } {
  const raw = input.trim()
  if (!raw) {
    return { ok: false, message: '값을 입력해주세요.' }
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length !== 4) {
    return {
      ok: false,
      message: 'G,C,E,A 순서로 정확히 4개 숫자를 입력해주세요.',
    }
  }
  const nums: number[] = []
  for (const p of parts) {
    if (!/^\d+$/.test(p)) {
      return { ok: false, message: '각 값은 0 이상의 정수만 입력할 수 있어요.' }
    }
    const n = Number.parseInt(p, 10)
    if (n > 15) {
      return { ok: false, message: '각 값은 0~15 사이여야 해요.' }
    }
    nums.push(n)
  }
  return {
    ok: true,
    frets: [nums[0]!, nums[1]!, nums[2]!, nums[3]!],
  }
}
