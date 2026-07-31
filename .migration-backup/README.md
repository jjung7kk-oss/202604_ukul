# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Design Guide (Score Create)

`악보 만들기` 화면은 아래 원칙을 유지합니다.

1. `/` 입력은 데이터/입력 방식 그대로 유지하고, 표시에서는 마디 경계처럼 보이게 한다.
   - 사용자는 기존처럼 슬래시(`/`)를 직접 입력한다.
   - 입력 오버레이에서 슬래시 위치만 아주 옅은 하늘색으로 강조해 마디 경계를 직관적으로 인지하게 한다.
2. 미리보기에서 선택한 마디는 입력 영역 하이라이트로 연결한다.
   - 미리보기 마디 선택 시 상단 입력 영역에서 해당 줄을 시각적으로 강조한다.
   - 자동 스크롤 이동이나 위치 설명 텍스트는 추가하지 않는다.
   - 코드 입력 줄에서는 선택 마디 구간을 약하게 힌트로 표시한다.
3. 미리보기 폭은 실제 A4 인쇄 폭과 최대한 일치시킨다.
   - 화면 미리보기와 인쇄/PDF 줄 길이 차이를 최소화한다.
   - 미리보기 컨테이너 폭과 `@media print` 기준을 A4 폭 기준으로 맞춘다.
