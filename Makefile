# プラットフォームと環境を設定
PLATFORM=web
ENV=local

# 初期化コマンド
.PHONY: init
init:
	# 必要なツールがインストールされているかチェック
	sh ./bin/check_install.sh
	# asdfをインストール
	asdf install
	# dotenvxとatlasをインストール
	npm install -g @dotenvx/dotenvx;
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
	# データベースのマイグレーションとモデルのビルドを実行
	make atlas-init-migration
	make build-model
	@echo "Woo-hoo! Everything's ready to roll!"

# ローカル環境での起動コマンド
.PHONY: run
run:
	# プロジェクト名を設定
	export PROJECT_NAME=$$(basename $$(pwd))
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

# フロントエンドlintコマンド
.PHONY: lint-frontend
lint-frontend:
	cd frontend && bun run lint

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
	# プロジェクト名を設定
	export PROJECT_NAME=$$(basename $$(pwd))
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
.PHONY: build-model-frontend-supabase
build-model-frontend-supabase:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		$(eval DIR_PATH := "./frontend/packages/types"); \
		mkdir -p $(DIR_PATH) && npx dotenvx run -f env/backend/${ENV}.env -- supabase gen types typescript --local > $(DIR_PATH)/schema.ts; \
	fi

.PHONY: build-model-prisma
build-model-prisma:
	# バックエンド用Prismaクライアントのみ生成（フロントエンドではSupabaseクライアントを使用）
	@echo "Prisma client generation for backend only"

# Edge functionsのモデルをビルド
.PHONY: build-model-functions
build-model-functions:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		mkdir -p ./supabase/functions/shared/types && npx dotenvx run -f env/backend/${ENV}.env -- supabase gen types typescript --local > ./supabase/functions/shared/types/schema.ts; \
	fi

# フロントエンドのSupabase型生成
.PHONY: build-model-frontend-supabase-types
build-model-frontend-supabase-types:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi
	# TypeScript型を生成
	make build-model-frontend-supabase

# モデルをビルド
.PHONY: build-model
build-model:
	# フロントエンドのモデルをビルド
	make build-model-frontend-supabase
	# Edge functionsのモデルをビルド
	make build-model-functions

# ===== Atlas マイグレーションコマンド（Prisma風） =====

# 開発用マイグレーション（Prismaの migrate dev に相当）
# ローカル環境専用: マイグレーション生成 → 適用 → 型生成を一括実行
.PHONY: migrate-dev
migrate-dev:
	@make atlas-validate;
	@make atlas-lint;
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
	# Atlas Dev DBを起動
	@echo "🐘 Starting Atlas dev database..."
	export PROJECT_NAME=$$(basename $$(pwd)) && \
	docker-compose -f docker-compose.backend.yaml up -d atlas_dev_db
	@sleep 2
	# Supabaseを起動
	npx dotenvx run -f env/backend/local.env -- supabase start
	# マイグレーションを生成
	@echo "📝 Generating migration..."
	npx dotenvx run -f env/migration/local.env -- atlas migrate diff \
		--config file://atlas/atlas.hcl \
		--env local
	# マイグレーションを適用
	@echo "✅ Applying migration to local database..."
	npx dotenvx run -f env/migration/local.env -- atlas migrate apply \
		--config file://atlas/atlas.hcl \
		--env local
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
	@make atlas-validate;
	@make atlas-lint;
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ] || [ -z "${ENV}" ]; then \
		npx dotenvx run -f env/backend/local.env -- supabase start; \
	fi
	# マイグレーションを適用
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		echo "📍 Deploying to: local"; \
		npx dotenvx run -f env/migration/local.env -- atlas migrate apply \
			--config file://atlas/atlas.hcl \
			--env local; \
	else \
		echo "📍 Deploying to: ${ENV}"; \
		npx dotenvx run -f env/migration/${ENV}.env -- atlas migrate apply \
			--config file://atlas/atlas.hcl \
			--env ${ENV}; \
	fi
	# モデル生成（ローカルのみ）
	@if [ -z "${ENV}" ] || [ "${ENV}" = "local" ]; then \
		make build-model; \
	fi
	@echo ""
	@echo "✅ Migration deployment complete!"

# スキーマ検証（Atlasベース）
.PHONY: atlas-validate
atlas-validate:
	atlas schema validate --config file://atlas/atlas.hcl --env ${ENV}

# マイグレーションLintチェック（Atlasベース）
.PHONY: atlas-lint
atlas-lint:
	atlas migrate lint --config file://atlas/atlas.hcl --env ${ENV}

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
