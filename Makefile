# プラットフォームと環境を設定
PLATFORM=web
ENV=local

# 初期化コマンド
.PHONY: init
init:
	# 必要なツールがインストールされているかチェック
	sh ./bin/check_install.sh
	# asdfプラグインを追加（既に追加済みの場合はスキップ）
	asdf plugin add nodejs https://github.com/asdf-vm/asdf-nodejs.git 2>/dev/null || true
	asdf plugin add python https://github.com/asdf-community/asdf-python.git 2>/dev/null || true
	asdf plugin add deno https://github.com/asdf-community/asdf-deno.git 2>/dev/null || true
	# asdfをインストール
	asdf install
	# dotenvxとatlasをインストール
	npm install -g @dotenvx/dotenvx;
	# .envファイルを作成（Docker Compose用のプロジェクト名設定）
	@if [ ! -f ".env" ]; then \
		echo "Creating .env file for Docker Compose..."; \
		echo "PROJECT_NAME=$$(basename $$(pwd))" > .env; \
		echo "✅ Created .env with PROJECT_NAME=$$(basename $$(pwd))"; \
	else \
		echo "ℹ️  .env file already exists, skipping creation"; \
	fi
	# Supabaseにログイン
	npx dotenvx run -f env/backend/${ENV}.env -- supabase login
	# Supabaseを初期化
	yes 'N' | npx dotenvx run -f env/backend/${ENV}.env -- supabase init --force
	# Supabaseを起動（dotenvxで環境変数を読み込む）
	npx dotenvx run -f env/backend/${ENV}.env -- supabase start
	# シークレットの設定がなければコピー
	if [ ! -f "env/secrets.env" ]; then \
		cp env/secrets.env.example env/secrets.env; \
	fi
	# Atlasのインストール（macOS / Linux）
	curl -sSf https://atlasgo.sh | sh
	# フロントエンドとバックエンドの依存関係もインストール
	cd frontend && bun install
	@echo ""
	@echo "✅ Initial setup complete!"
	@echo ""
	@echo "📝 Next steps:"
	@echo "  1. Run 'make migrate-dev' to generate and apply initial database migrations"
	@echo "  2. Run 'make run' to start backend services"
	@echo "  3. Run 'make frontend' to start frontend development server"
	@echo ""
	@echo "Woo-hoo! Everything's ready to roll!"

# ローカル環境での起動コマンド
.PHONY: run
run:
	# # 共通の.git設定のファイルをコピー
	# make copy-git-config
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi
	# Docker Composeでサービスを起動
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	# docker-compose -f ./docker-compose.frontend.yaml -f ./docker-compose.ai.yaml -f ./docker-compose.backend.yaml -f ./docker-compose.batch.yaml up -d --force-recreate
	export PROJECT_NAME=$$(basename $$(pwd))
	docker-compose -f ./docker-compose.backend.yaml up -d --force-recreate


# ローカル環境でのフロントエンド起動コマンド
.PHONY: frontend
frontend:
	cd frontend && npx dotenvx run -f ../env/frontend/${ENV}.env -- bun run dev

# ローカル環境での停止コマンド
.PHONY: stop
stop:
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	docker-compose -f ./docker-compose.backend.yaml down
	# Supabaseを停止（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase stop; \
	fi

# フロントエンドビルドコマンド
.PHONY: build-frontend
build-frontend:
	cd frontend && bun run build

# ===== フロントエンド lint/format コマンド =====

# Biome lint（自動修正）
.PHONY: lint-frontend
lint-frontend:
	cd frontend && bun run lint

# Biome lint（CI用、修正なし）
.PHONY: lint-frontend-ci
lint-frontend-ci:
	cd frontend && bun run lint:ci

# Biome format（自動修正）
.PHONY: format-frontend
format-frontend:
	cd frontend && bun run format

# Biome formatチェック（チェックのみ）
.PHONY: format-frontend-check
format-frontend-check:
	cd frontend && bun run format-check

# TypeScript型チェック
.PHONY: type-check-frontend
type-check-frontend:
	cd frontend && bun run type-check

# ===== Supabase Edge Functions lint/format/check コマンド =====

# Deno format（自動修正）
.PHONY: format-functions
format-functions:
	deno fmt supabase/functions/

# Deno formatチェック（チェックのみ）
.PHONY: format-functions-check
format-functions-check:
	deno fmt --check supabase/functions/

# Deno lint
.PHONY: lint-functions
lint-functions:
	deno lint supabase/functions/

# Deno型チェック（全functionを自動検出）
.PHONY: check-functions
check-functions:
	@echo "🔍 Type checking Edge Functions..."
	@for dir in supabase/functions/*/; do \
		if [ -f "$$dir/index.ts" ]; then \
			func_name=$$(basename "$$dir"); \
			echo "Checking $$func_name..."; \
			if [ -f "$$dir/deno.json" ]; then \
				echo "  Caching dependencies..."; \
				(cd "$$dir" && deno cache --config=deno.json index.ts) 2>&1 | grep -v "Download" || true; \
				echo "  Running type check..."; \
				(cd "$$dir" && deno check --config=deno.json index.ts) || echo "  ⚠️  Type check failed for $$func_name"; \
			else \
				echo "  No deno.json found, using default check..."; \
				deno check "$$dir/index.ts" || echo "  ⚠️  Type check failed for $$func_name"; \
			fi \
		fi \
	done
	@echo "✅ Type check complete!"

# ===== 統合 lint/format コマンド =====

# 全体のlint（フロントエンド + Edge Functions）
.PHONY: lint
lint:
	@echo "🔍 Running lint for all projects..."
	@make lint-frontend
	@make lint-functions

# 全体のformat（自動修正）
.PHONY: format
format:
	@echo "✨ Formatting all projects..."
	@make format-frontend
	@make format-functions

# 全体のformatチェック（CI用）
.PHONY: format-check
format-check:
	@echo "🔍 Checking format for all projects..."
	@make format-frontend-check
	@make format-functions-check

# 全体の型チェック
.PHONY: type-check
type-check:
	@echo "🔍 Type checking all projects..."
	@make type-check-frontend
	@make check-functions

# CI用の全チェック（lint + format + type-check）
.PHONY: ci-check
ci-check:
	@echo "🚀 Running all CI checks..."
	@echo "📝 Frontend: Biome CI (lint + format + organize imports)..."
	@make lint-frontend-ci
	@echo "📝 Edge Functions: Deno lint + format check..."
	@make lint-functions
	@make format-functions-check
	@echo "🔍 Type checking all projects..."
	@make type-check

.PHONY: deploy-functions
deploy-functions:
	# ENV=localの場合はスキップ、それ以外はproject-refを指定してデプロイ
	if [ "${ENV}" != "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy watermark --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		npx dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-checkout --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		npx dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-products --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		npx dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-webhooks --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
	else \
		echo "Skipping deploy-functions for local environment"; \
	fi

# チェックコマンド
.PHONY: check
check:
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi
	# バックエンドサービスの状態確認
	docker-compose -f ./docker-compose.backend.yaml ps

# 共通の.git設定のファイルをコピー
# プリコミットなども
.PHONY: copy-git-config
copy-git-config:
	\cp -f .git-dev/info/exclude .git/info/exclude

# Supabaseのモデルをビルド（モノレポ対応）
.PHONY: build-model-frontend
build-model-frontend:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		mkdir -p "./frontend/packages/types"; \
		supabase gen types typescript --local > "./frontend/packages/types/schema.ts"; \
	fi

# Edge functionsのモデルをビルド
.PHONY: build-model-functions
build-model-functions:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		mkdir -p ./supabase/functions/shared/types/supabase; \
		supabase gen types typescript --local > ./supabase/functions/shared/types/supabase/schema.ts; \
		mkdir -p ./supabase/functions/shared/drizzle && cp -r ./drizzle/schema/* ./supabase/functions/shared/drizzle/; \
		echo "✅ Copied Drizzle schema to supabase/functions/shared/drizzle/"; \
	fi

# モデルをビルド
.PHONY: build-model
build-model:
	# フロントエンドのモデルをビルド
	make build-model-frontend
	# Edge functionsのモデルをビルド
	make build-model-functions

# ===== Drizzle マイグレーションコマンド（Prisma風） =====

# 開発用マイグレーション（Prismaの migrate dev に相当）
# ローカル環境専用: マイグレーション生成 → 適用 → 型生成を一括実行
.PHONY: migrate-dev
migrate-dev:
	@# ENVが指定されていて、かつlocal以外の場合は警告
	@if [ -n "${ENV}" ] && [ "${ENV}" != "local" ]; then \
		echo "⚠️  ERROR: migrate-dev is for local development only!"; \
		echo "Specified ENV: ${ENV}"; \
		echo ""; \
		echo "Use 'ENV=${ENV} make migrate-deploy' for remote environments."; \
		exit 1; \
	fi
	@echo "🚀 Running migrate-dev (generate + apply + build-model)..."
	@echo ""
	# Supabaseを起動
	npx dotenvx run -f env/backend/local.env -- supabase start
	# マイグレーションを生成
	@echo "📝 Generating migration..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run generate
	# マイグレーションを適用
	@echo "✅ Applying migration to local database..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run migrate
	# カスタムSQL（関数・トリガー・拡張）をプログラマティックに適用
	@echo "🔧 Applying custom SQL (functions, triggers, extensions)..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run migrate:custom
	# モデル生成
	@echo "🔧 Generating database types..."
	make build-model
	@echo ""
	@echo "✨ Done! Don't forget to commit migration files to Git."

# 本番用マイグレーション適用（Prismaの migrate deploy に相当）
# 全環境で使用可能: 既存のマイグレーションファイルを適用するだけ
.PHONY: migrate-deploy
migrate-deploy:
	@echo "🚀 Deploying migrations to ${ENV} environment..."
	@echo ""
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ] || [ -z "${ENV}" ]; then \
		npx dotenvx run -f env/backend/local.env -- supabase start; \
	fi
	# マイグレーションを適用
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		echo "📍 Deploying to: local"; \
		cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run migrate; \
	else \
		echo "📍 Deploying to: ${ENV}"; \
		cd drizzle && npx dotenvx run -f ../env/migration/${ENV}.env -- bun run migrate; \
	fi
	# カスタムSQL（関数・トリガー・拡張）を確実に適用
	@echo "🔧 Applying custom SQL (functions, triggers, extensions)..."
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run migrate:custom; \
	else \
		cd drizzle && npx dotenvx run -f ../env/migration/${ENV}.env -- bun run migrate:custom; \
	fi
	# モデル生成（ローカルのみ）
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		make build-model; \
	fi
	@echo ""
	@echo "✅ Migration deployment complete!"

# マイグレーション生成のみ（migrate-devの一部を切り出し）
.PHONY: migration
migration: migrate-dev

# スキーマを直接DBにプッシュ（開発時の高速プロトタイピング用）
.PHONY: drizzle-push
drizzle-push:
	@echo "🚀 Pushing schema to database..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run push

# Drizzle Studio起動（GUIでDBを操作）
.PHONY: drizzle-studio
drizzle-studio:
	@echo "🎨 Starting Drizzle Studio..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run studio

# スキーマ検証（Drizzleベース）
.PHONY: drizzle-validate
drizzle-validate:
	@echo "✅ Validating Drizzle schema..."
	cd drizzle && npx dotenvx run -f ../env/migration/local.env -- bun run check

# ===== その他のコマンド =====

.PHONY: seed
seed:
	@echo "Warning: Seed functionality is currently disabled"
	@echo "Please implement seed logic with Atlas if needed"

# ロールバックコマンド
.PHONY: rollback
rollback:
	@echo "⚠️  Atlas does not have built-in rollback command."
	@echo "For rollback, manually remove the last migration file and run 'make migration-apply'."
	@exit 1
