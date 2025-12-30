# Node.js Alpine をベースに Bun をインストール
# Storybook 10 requires Node.js 20.19+ or 22.12+
FROM node:22.21.1-alpine AS base
WORKDIR /app

# Bun をインストール
RUN npm install -g bun

# 開発用（ボリュームマウントで使用）
FROM base AS dev

# bun install はコンテナ起動時に実行
EXPOSE 6006
CMD ["sh", "-c", "bun install && bun run storybook -- --host 0.0.0.0"]
