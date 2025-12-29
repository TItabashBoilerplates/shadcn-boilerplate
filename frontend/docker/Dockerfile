FROM oven/bun:1.2.8-alpine AS base
WORKDIR /app

# 開発用（ボリュームマウントで使用）
FROM base AS dev

# bun installはコンテナ起動時に実行
EXPOSE 6006
CMD ["sh", "-c", "bun install && bun run storybook -- --host 0.0.0.0"]
