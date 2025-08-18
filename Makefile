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
	supabase login
	# Supabaseを初期化
	yes 'N' | supabase init --force
	# Supabaseを起動
	supabase start
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
	cd frontend && yarn install
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
	# Supabaseを起動
	supabase start
	# Docker Composeでサービスを起動
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	# docker-compose -f ./docker-compose.frontend.yaml -f ./docker-compose.ai.yaml -f ./docker-compose.backend.yaml -f ./docker-compose.batch.yaml up -d --force-recreate
	docker-compose -f ./docker-compose.backend.yaml up -d --force-recreate


# ローカル環境でのフロントエンド起動コマンド
.PHONY: frontend
frontend:
	cd frontend && npx dotenvx run -f ../env/frontend/${ENV}.env -- yarn run web

# ローカル環境での停止コマンド
.PHONY: stop
stop:
	if [ "${ENV}" != "local" ]; then \
		export ENV=${ENV}; \
	fi
	docker-compose -f ./docker-compose.backend.yaml down
	supabase stop

# iOS用のローカル起動コマンド
.PHONY: local-ios-ts
local-ios-ts:
	cd frontend && npx dotenvx run -f ../env/frontend/${ENV}.env -- yarn run ios

# Android用のローカル起動コマンド
.PHONY: local-android-ts
local-android-ts:
	cd frontend && npx dotenvx run -f ../env/frontend/${ENV}.env -- yarn run android

.PHONY: deploy-functions
deploy-functions:
	# 必要な関数を追加
	supabase functions deploy watermark --no-verify-jwt
	supabase functions deploy stripe-checkout --no-verify-jwt
	supabase functions deploy stripe-products --no-verify-jwt
	supabase functions deploy stripe-webhooks --no-verify-jwt

# チェックコマンド
.PHONY: check
check:
	# プロジェクト名を設定
	export PROJECT_NAME=$$(basename $$(pwd))
	# Supabaseを起動
	supabase start
	# Docker Composeの設定を変換
	docker-compose -f ./docker-compose.blockchain.yaml convert

# Prismaのモデルをビルド
.PHONY: build-model-frontend-prisma
build-model-frontend-prisma:
	npx prisma generate --schema=./prisma/schema.prisma --generator frontendClient
	npx prisma generate --schema=./prisma/schema.prisma --generator frontendFlutterClient
	cd frontend-flutter && flutter pub run build_runner build --delete-conflicting-outputs

# 共通の.git設定のファイルをコピー
# プリコミットなども
.PHONY: copy-git-config
copy-git-config:
	\cp -f .git-dev/info/exclude .git/info/exclude

# Supabaseのモデルをビルド
.PHONY: build-model-frontend-supabase
build-model-frontend-supabase:
	# Supabaseを起動
	supabase start
	# モデルの型を生成
	$(eval DIR_PATH := "./frontend-tamagui/packages/app/shared/type/supabase/__generated__")
	mkdir -p $(DIR_PATH) && supabase gen types typescript --local > $(DIR_PATH)/schema.types.ts

.PHONY: build-model-prisma
build-model-prisma:
	# フロントエンドのモデルをビルド
	make build-model-frontend-prisma

# Edge functionsのモデルをビルド
.PHONY: build-model-functions
build-model-functions:
	# Supabaseを起動
	supabase start
	# モデルの型を生成
	mkdir -p ./supabase/functions/domain/entity/__generated__ && supabase gen types typescript --local > ./supabase/functions/domain/entity/__generated__/schema.ts

# フロントエンドのモデルをビルド
.PHONY: build-model-frontend-graphql
build-model-frontend-graphql:
	# Supabaseを起動
	supabase start
	# マイグレーションを実行
	make migration
	# コードを生成
	cd frontend && yarn codegen:supabase

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
	# Supabaseを起動
	supabase start

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
	make seed

.PHONY: migration
migration:
	supabase start
	if [ "${ENV}" == "local" ]; then \
		cd prisma && npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate dev --skip-generate --skip-seed; \
		cd .. && make build-model-frontend-prisma; \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/${ENV}/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
		make build-model-frontend-supabase; \
	else \
		cd prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma migrate deploy; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/base.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/extension.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/function.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/${ENV}/hooks.sql --schema schema.prisma; \
		npx dotenvx run -f ../env/migration/${ENV}.env -- npx prisma db execute --file ./config/realtime.sql --schema schema.prisma; \
		cd ..; \
	fi
	make seed;
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
