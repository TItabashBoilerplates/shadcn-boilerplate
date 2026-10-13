import { defineConfig } from '@hey-api/openapi-ts'

const backendUrl =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_PY_URL ?? 'http://127.0.0.1:4040'

export default defineConfig({
  input: `${backendUrl}/openapi.json`,
  // 生成物は biome.json の ignore 対象なので整形（postProcess）は掛けない
  output: './src/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: './src/runtime-config',
    },
    {
      name: '@tanstack/react-query',
    },
  ],
})
