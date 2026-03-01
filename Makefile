# プラットフォームと環境を設定
PLATFORM=web
ENV=local

# ===== devenv 環境チェック =====
# devenv shell / direnv が有効でなければ即座にエラー終了
.PHONY: _devenv
_devenv:
	@test -n "$$DEVENV_ROOT" || { \
		echo "❌ Error: devenv shell is not active."; \
		echo "   Run 'devenv shell' or 'direnv allow' first."; \
		exit 1; \
	}

# devenv が必要なターゲット（devenv shell 外では実行不可）
init run frontend stop check: _devenv
mobile mobile-ios mobile-android mobile-web: _devenv
type-check-mobile build-mobile-ios build-mobile-android: _devenv
build-frontend lint-frontend lint-fsd: _devenv
format-frontend format-frontend-check type-check-frontend: _devenv
format-functions format-functions-check lint-functions check-functions: _devenv
lint-drizzle format-drizzle format-drizzle-check: _devenv
lint-backend-py format-backend-py format-backend-py-check: _devenv
type-check-backend-py lint format format-check type-check ci-check: _devenv
# pre-commit hook から呼ばれる -ci ターゲット（$DEVENV_ROOT が伝播しないため _devenv 不要）
# devenv が git-hooks をインストールするため、hook 実行時はツールが PATH 上に存在する
lint-frontend-ci lint-drizzle-ci lint-backend-py-ci:
deploy-functions polar-sync-dry polar-sync deploy-polar-webhooks: _devenv
build-model-frontend build-model-backend build-model-functions build-model: _devenv
migrate-dev migrate-deploy drizzle-push drizzle-studio drizzle-validate: _devenv
seed seed-db seed-storage: _devenv
storybook-local build-storybook: _devenv
e2e e2e-web e2e-mobile: _devenv
deploy-supabase supabase-link deploy-config deploy-functions-all deploy-secrets deploy-buckets: _devenv

# direnv を有効化（初回セットアップ時）
# _devenv チェック不要 - devenv shell なしで実行可能（make init の前提条件）
# セキュリティ上の理由から direnv は初回のみ手動で allow が必要
.PHONY: direnv-allow
direnv-allow:
	@if command -v direnv >/dev/null 2>&1; then \
		direnv allow; \
		echo "✅ direnv enabled. 次回から 'cd' するだけで devenv が自動起動します。"; \
	else \
		echo "❌ direnv not found. Install with: brew install direnv"; \
		echo "   Then add to ~/.zshrc: eval \"\$$(direnv hook zsh)\""; \
		exit 1; \
	fi

# 初期化コマンド
.PHONY: init
init:
	# 必要なツールがインストールされているかチェック
	sh ./bin/check_install.sh
	# .envファイルを作成（Docker Compose用のプロジェクト名設定）
	@if [ ! -f ".env" ]; then \
		echo "Creating .env file for Docker Compose..."; \
		echo "PROJECT_NAME=$$(basename $$(pwd))" > .env; \
		echo "✅ Created .env with PROJECT_NAME=$$(basename $$(pwd))"; \
	else \
		echo "ℹ️  .env file already exists, skipping creation"; \
	fi
	# env/backend/local.envのshadcn-boilerplateをプロジェクト名に置き換え
	@if [ -f "env/backend/${ENV}.env" ]; then \
		PROJECT_NAME=$$(basename $$(pwd)); \
		if grep -q "shadcn-boilerplate" "env/backend/${ENV}.env"; then \
			echo "Updating env/backend/${ENV}.env with PROJECT_NAME=$$PROJECT_NAME..."; \
			sed -i.bak "s/shadcn-boilerplate/$$PROJECT_NAME/g" "env/backend/${ENV}.env"; \
			rm -f "env/backend/${ENV}.env.bak"; \
			echo "✅ Updated env/backend/${ENV}.env"; \
		else \
			echo "ℹ️  env/backend/${ENV}.env already updated or no shadcn-boilerplate found"; \
		fi \
	fi
	# Supabaseにログイン
	dotenvx run -f env/backend/${ENV}.env -- supabase login
	# Supabaseを初期化
	yes 'N' | dotenvx run -f env/backend/${ENV}.env -- supabase init --force
	# Supabaseを起動（dotenvxで環境変数を読み込む）
	dotenvx run -f env/backend/${ENV}.env -- supabase start
	# シークレットの設定がなければコピー
	if [ ! -f "env/secrets.env" ]; then \
		cp env/secrets.env.example env/secrets.env; \
	fi
	# フロントエンドの依存関係をインストール
	cd frontend && ni
	# direnv を有効化（次回以降 cd で自動アクティベーション）
	@if command -v direnv >/dev/null 2>&1; then \
		direnv allow; \
		echo "✅ direnv enabled (auto-activation on cd)"; \
	fi
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
		dotenvx run -f env/backend/${ENV}.env -f env/secrets.env -- supabase start; \
		dotenvx run -f env/backend/${ENV}.env -f env/secrets.env -- supabase seed buckets --local; \
	fi
	# Docker Composeでサービスを起動（backend + storybook）
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	export PROJECT_NAME=$$(basename $$(pwd))
	docker compose -f ./docker-compose.backend.yaml -f ./docker-compose.frontend.yaml up -d --force-recreate


# ローカル環境でのフロントエンド起動コマンド
.PHONY: frontend
frontend:
	cd frontend && dotenvx run -f ../env/frontend/${ENV}.env -- nr dev

# ===== Mobile (Expo) コマンド =====

# Mobile開発サーバー起動（全プラットフォーム選択可能）
.PHONY: mobile
mobile:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx expo start

# Mobile開発サーバー起動（iOS）
.PHONY: mobile-ios
mobile-ios:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx expo start --ios

# Mobile開発サーバー起動（Android）
.PHONY: mobile-android
mobile-android:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx expo start --android

# Mobile開発サーバー起動（Web）
.PHONY: mobile-web
mobile-web:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx expo start --web

# Mobile型チェック
.PHONY: type-check-mobile
type-check-mobile:
	cd frontend/apps/mobile && nlx tsc --noEmit

# Mobileビルド（EASを使用）
.PHONY: build-mobile-ios
build-mobile-ios:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx eas build --platform ios

.PHONY: build-mobile-android
build-mobile-android:
	cd frontend/apps/mobile && dotenvx run -f ../../../env/frontend/${ENV}.env -- nlx eas build --platform android

# ローカル環境での停止コマンド
.PHONY: stop
stop:
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	docker compose -f ./docker-compose.backend.yaml -f ./docker-compose.frontend.yaml down
	# Supabaseを停止（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		dotenvx run -f env/backend/${ENV}.env -- supabase stop; \
	fi

# フロントエンドビルドコマンド
.PHONY: build-frontend
build-frontend:
	cd frontend && nr build

# ===== フロントエンド lint/format コマンド =====

# Biome lint（自動修正）
.PHONY: lint-frontend
lint-frontend:
	cd frontend && nr lint

# Biome lint（CI用、修正なし）
.PHONY: lint-frontend-ci
lint-frontend-ci:
	cd frontend && nr lint:ci

# FSD境界チェック（Web + Mobile）
.PHONY: lint-fsd
lint-fsd:
	@echo "🔍 Running FSD boundary checks..."
	cd frontend/apps/web && nr lint:fsd
	cd frontend/apps/mobile && nr lint:fsd

# Biome format（自動修正）
.PHONY: format-frontend
format-frontend:
	cd frontend && nr format

# Biome formatチェック（チェックのみ）
.PHONY: format-frontend-check
format-frontend-check:
	cd frontend && nr format-check

# TypeScript型チェック
.PHONY: type-check-frontend
type-check-frontend:
	cd frontend && nr type-check

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

# ===== Drizzle lint/format コマンド =====

# Biome lint（自動修正）
.PHONY: lint-drizzle
lint-drizzle:
	cd drizzle && nr lint

# Biome lint（CI用、修正なし）
.PHONY: lint-drizzle-ci
lint-drizzle-ci:
	cd drizzle && nr lint:ci

# Biome format（自動修正）
.PHONY: format-drizzle
format-drizzle:
	cd drizzle && nr format

# Biome formatチェック（チェックのみ）
.PHONY: format-drizzle-check
format-drizzle-check:
	cd drizzle && nr format-check

# ===== Backend Python lint/format コマンド =====

# Ruff lint（自動修正）
.PHONY: lint-backend-py
lint-backend-py:
	cd backend-py/app && uv run ruff check --fix src/

# Ruff lint（CI用、修正なし）
.PHONY: lint-backend-py-ci
lint-backend-py-ci:
	cd backend-py/app && uv run ruff check src/

# Ruff format（自動修正）
.PHONY: format-backend-py
format-backend-py:
	cd backend-py/app && uv run ruff format src/

# Ruff formatチェック（チェックのみ）
.PHONY: format-backend-py-check
format-backend-py-check:
	cd backend-py/app && uv run ruff format --check src/

# MyPy型チェック
.PHONY: type-check-backend-py
type-check-backend-py:
	cd backend-py/app && uv run mypy src/

# ===== 統合 lint/format コマンド =====

# 全体のlint（フロントエンド + Drizzle + Backend Python + Edge Functions）
.PHONY: lint
lint:
	@echo "🔍 Running lint for all projects..."
	@make lint-frontend
	@make lint-drizzle
	@make lint-backend-py
	@make lint-functions

# 全体のformat（自動修正）
.PHONY: format
format:
	@echo "✨ Formatting all projects..."
	@make format-frontend
	@make format-drizzle
	@make format-backend-py
	@make format-functions

# 全体のformatチェック（CI用）
.PHONY: format-check
format-check:
	@echo "🔍 Checking format for all projects..."
	@make format-frontend-check
	@make format-drizzle-check
	@make format-backend-py-check
	@make format-functions-check

# 全体の型チェック
.PHONY: type-check
type-check:
	@echo "🔍 Type checking all projects..."
	@make type-check-frontend
	@make type-check-mobile
	@make type-check-backend-py
	@make check-functions

# CI用の全チェック（lint + format + type-check）
.PHONY: ci-check
ci-check:
	@echo "🚀 Running all CI checks..."
	@echo "📝 Frontend: Biome CI (lint + format + organize imports)..."
	@make lint-frontend-ci
	@echo "📝 Drizzle: Biome CI (lint + format)..."
	@make lint-drizzle-ci
	@echo "📝 Backend Python: Ruff CI (lint + format)..."
	@make lint-backend-py-ci
	@make format-backend-py-check
	@echo "📝 Edge Functions: Deno lint + format check..."
	@make lint-functions
	@make format-functions-check
	@echo "🔍 Type checking all projects..."
	@make type-check

.PHONY: deploy-functions
deploy-functions:
	# ENV=localの場合はスキップ、それ以外はproject-refを指定してデプロイ
	if [ "${ENV}" != "local" ]; then \
		dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy watermark --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-checkout --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-products --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		dotenvx run -f env/backend/${ENV}.env -- bash -c 'supabase functions deploy stripe-webhooks --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
		dotenvx run -f env/backend/${ENV}.env -f env/secrets.env -- bash -c 'supabase functions deploy polar-webhooks --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
	else \
		echo "Skipping deploy-functions for local environment"; \
	fi

# ===== Polar.sh Commands =====

# プラン同期（Dry Run）- 変更内容を確認のみ
.PHONY: polar-sync-dry
polar-sync-dry:
	@echo "🔍 Checking plan differences (dry run)..."
	cd frontend && dotenvx run -f ../env/secrets.env -f ../env/frontend/${ENV}.env -- bun run ../scripts/polar/sync.ts --dry-run

# プラン同期（実行）- Polar.sh にプラン定義を同期
.PHONY: polar-sync
polar-sync:
	@echo "🚀 Syncing plans to Polar.sh..."
	cd frontend && dotenvx run -f ../env/secrets.env -f ../env/frontend/${ENV}.env -- bun run ../scripts/polar/sync.ts

# Polar Webhook デプロイ
.PHONY: deploy-polar-webhooks
deploy-polar-webhooks:
	@if [ "${ENV}" != "local" ]; then \
		echo "🚀 Deploying Polar webhook handler..."; \
		dotenvx run -f env/backend/${ENV}.env -f env/secrets.env -- bash -c 'supabase functions deploy polar-webhooks --no-verify-jwt --project-ref $$SUPABASE_PROJECT_REF'; \
	else \
		echo "⚠️  Skipping deploy for local environment"; \
	fi

# チェックコマンド
.PHONY: check
check:
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi
	# バックエンドサービスの状態確認
	docker compose -f ./docker-compose.backend.yaml ps

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
		dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		mkdir -p "./frontend/packages/types"; \
		supabase gen types typescript --local > "./frontend/packages/types/schema.ts"; \
		echo "🔧 Generating backend API client (Hey API)..."; \
		cd frontend && dotenvx run -f ../env/frontend/${ENV}.env -- bun run --filter @workspace/api-client generate || echo "⚠️  Backend API client generation skipped (backend not running)"; \
	fi

.PHONY: build-model-backend
build-model-backend:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		docker compose -f ./docker-compose.backend.yaml restart; \
	fi

# Edge functionsのモデルをビルド
.PHONY: build-model-functions
build-model-functions:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		dotenvx run -f env/backend/${ENV}.env -- supabase start; \
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
	# バックエンドのモデルをビルド
	make build-model-backend

# ===== Drizzle マイグレーションコマンド =====

# 開発用マイグレーション
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
	dotenvx run -f env/backend/local.env -- supabase start
	# Pre-migration SQL適用（extensions等）
	@echo "🔧 Applying pre-migration SQL (extensions)..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate:pre
	# マイグレーションを生成
	@echo "📝 Generating migration..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr generate
	# マイグレーションを適用
	@echo "✅ Applying migration to local database..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate
	# Post-migration SQL適用（functions/triggers等）
	@echo "🔧 Applying post-migration SQL (functions, triggers)..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate:post
	# モデル生成
	@echo "🔧 Generating database types..."
	make build-model
	@echo ""
	@echo "✨ Done! Don't forget to commit migration files to Git."

# 本番用マイグレーション適用
# 全環境で使用可能: 既存のマイグレーションファイルを適用するだけ
.PHONY: migrate-deploy
migrate-deploy:
	@echo "🚀 Deploying migrations to ${ENV} environment..."
	@echo ""
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ] || [ -z "${ENV}" ]; then \
		dotenvx run -f env/backend/local.env -- supabase start; \
	fi
	# Pre-migration SQL適用（extensions等）
	@echo "🔧 Applying pre-migration SQL (extensions)..."
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate:pre; \
	else \
		cd drizzle && dotenvx run -f ../env/migration/${ENV}.env -- nr migrate:pre; \
	fi
	# マイグレーションを適用
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		echo "📍 Deploying to: local"; \
		cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate; \
	else \
		echo "📍 Deploying to: ${ENV}"; \
		cd drizzle && dotenvx run -f ../env/migration/${ENV}.env -- nr migrate; \
	fi
	# Post-migration SQL適用（functions/triggers等）
	@echo "🔧 Applying post-migration SQL (functions, triggers)..."
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		cd drizzle && dotenvx run -f ../env/migration/local.env -- nr migrate:post; \
	else \
		cd drizzle && dotenvx run -f ../env/migration/${ENV}.env -- nr migrate:post; \
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
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr push

# Drizzle Studio起動（GUIでDBを操作）
.PHONY: drizzle-studio
drizzle-studio:
	@echo "🎨 Starting Drizzle Studio..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr studio

# スキーマ検証（Drizzleベース）
.PHONY: drizzle-validate
drizzle-validate:
	@echo "✅ Validating Drizzle schema..."
	cd drizzle && dotenvx run -f ../env/migration/local.env -- nr check

# ===== その他のコマンド =====

# ===== Seed コマンド =====
# Database + Storage のシードデータを投入
# 詳細は .claude/skills/seed/SKILL.md を参照

# DB + Storage 両方
.PHONY: seed
seed:
	@make seed-check-env
	@make seed-db
	@make seed-storage

# DB のみ
.PHONY: seed-db
seed-db:
	@make seed-check-env
	@echo "Seeding database (${ENV})..."
	@if [ "${ENV}" = "local" ] || [ -z "${ENV}" ]; then \
		cd drizzle && dotenvx run -f ../env/migration/local.env -- bun run seed/index.ts; \
	else \
		cd drizzle && dotenvx run -f ../env/migration/${ENV}.env -- bun run seed/index.ts; \
	fi

# Storage のみ
.PHONY: seed-storage
seed-storage:
	@make seed-check-env
	@echo "Seeding storage buckets (${ENV})..."
	@if [ "${ENV}" = "local" ] || [ -z "${ENV}" ]; then \
		dotenvx run -f env/backend/local.env -- supabase seed buckets --local; \
	else \
		dotenvx run -f env/backend/${ENV}.env -- supabase seed buckets --linked; \
	fi

# 環境チェック（production 警告）
.PHONY: seed-check-env
seed-check-env:
	@if [ "${ENV}" = "production" ]; then \
		echo ""; \
		echo "WARNING: You are about to seed PRODUCTION!"; \
		echo ""; \
		echo "This will:"; \
		echo "  - Reset and insert test/sample data"; \
		echo "  - Potentially overwrite existing data"; \
		echo ""; \
		read -p "Are you sure you want to continue? [y/N] " confirm; \
		if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
			echo "Aborted."; \
			exit 1; \
		fi; \
	fi

# ロールバックコマンド
.PHONY: rollback
rollback:
	@echo "⚠️  Drizzle does not have built-in rollback command."
	@echo "For rollback, manually remove the last migration file and re-run migrations."
	@exit 1

# ===== Storybook コマンド =====

# Storybook起動（Docker - 推奨）
.PHONY: storybook
storybook:
	docker compose -f docker-compose.frontend.yaml up --build

# Storybook起動（ローカル - Dockerが使えない場合のみ）
.PHONY: storybook-local
storybook-local:
	cd frontend && bun run storybook

# Storybookビルド
.PHONY: build-storybook
build-storybook:
	cd frontend && bun run build-storybook

# ===== Maestro E2E Testing Commands =====

# E2Eテスト実行（全プラットフォーム）
.PHONY: e2e
e2e:
	cd .maestro && maestro test .

# E2Eテスト実行（Webのみ）
.PHONY: e2e-web
e2e-web:
	cd .maestro && maestro test web/

# E2Eテスト実行（Mobileのみ）
.PHONY: e2e-mobile
e2e-mobile:
	cd .maestro && maestro test mobile/

# ===== Supabase Remote Deploy コマンド =====
# 詳細は scripts/supabase/ を参照

# Supabase 一括デプロイ（リモート環境用）
.PHONY: deploy-supabase
deploy-supabase:
	@./scripts/supabase/deploy.sh

# リモートプロジェクトへのリンク
.PHONY: supabase-link
supabase-link:
	@./scripts/supabase/link.sh

# Config Push（Auth, API設定など）
.PHONY: deploy-config
deploy-config:
	@./scripts/supabase/deploy-config.sh

# Edge Functions 全デプロイ（既存の deploy-functions は個別デプロイ用に残す）
.PHONY: deploy-functions-all
deploy-functions-all:
	@./scripts/supabase/deploy-functions.sh

# Secrets 設定
.PHONY: deploy-secrets
deploy-secrets:
	@./scripts/supabase/deploy-secrets.sh

# Storage Buckets 同期
.PHONY: deploy-buckets
deploy-buckets:
	@./scripts/supabase/deploy-buckets.sh
