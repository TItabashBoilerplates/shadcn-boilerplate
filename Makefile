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
	# プロジェクト名を.envに書き込む
	echo "PROJECT_NAME=$$(basename $$(pwd))" > .env
	# envディレクトリ内のテキストファイルで"dapps-boilerplate"を置換
	find env -type f -name "*.env" -exec sed -i '' 's/dapps-boilerplate/$$(basename $$(pwd))/g' {} +
	# dotenvxとprismaをインストール
	npm install -g @dotenvx/dotenvx;
	npm install -g prisma;
	npm install -g @prisma/client;
	# フロントエンドとバックエンドの依存関係もインストール
	cd frontend && bun install
	# データベースのマイグレーションとモデルのビルドを実行
	make init-migration
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

# Prismaのモデルをビルド（削除予定 - 現在使用されていない）
.PHONY: build-model-frontend-prisma
build-model-frontend-prisma:
	@echo "Note: Frontend Prisma client generation is currently not used in this Next.js setup"

# 共通の.git設定のファイルをコピー
# プリコミットなども
.PHONY: copy-git-config
copy-git-config:
	\cp -f .git-dev/info/exclude .git/info/exclude

# Supabaseのモデルをビルド
.PHONY: build-model-frontend-supabase
build-model-frontend-supabase:
	# ENV=localの場合のみ実行
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
		$(eval DIR_PATH := "./frontend/src/shared/types"); \
		mkdir -p $(DIR_PATH) && npx dotenvx run -f env/backend/${ENV}.env -- supabase gen types typescript --local > $(DIR_PATH)/supabase.ts; \
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

.PHONY: seed
seed:
	cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma generate --schema=./schema.prisma --generator seedClient
	cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db seed

# 初期マイグレーションコマンド
.PHONY: init-migration
init-migration:
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi

	# 環境に応じてマイグレーションを実行
	if [ "${ENV}" == "local" ]; then \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate dev --name initial-migration --skip-generate --skip-seed; \
		cd .. && make build-model-frontend-supabase; \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
	else \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate deploy --create-only; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
	fi
	make build-model-functions;

.PHONY: migration
migration:
	# Supabaseを起動（ENV=localの場合のみ）
	if [ "${ENV}" = "local" ]; then \
		npx dotenvx run -f env/backend/${ENV}.env -- supabase start; \
	fi
	if [ "${ENV}" == "local" ]; then \
		cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate dev --skip-generate --skip-seed; \
		cd .. && make build-model-frontend-supabase; \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
		make build-model-frontend-supabase; \
	else \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate deploy; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
	fi;
	make build-model-functions;


.PHONY: rollback
rollback:
	@echo "Rolling back the last migration..."
	if [ "${ENV}" == "local" ]; then \
		cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate reset --force --skip-generate --skip-seed; \
	else \
		cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate resolve --rolled-back $(shell cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate list | grep -A 1 "Current migration" | tail -n 1 | awk '{print $$1}'); \
	fi
	@echo "Rollback completed."
