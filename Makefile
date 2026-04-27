# =============================================================================
# Makefile is DEPRECATED.
#
# All commands are now provided as devenv scripts (PATH-installed) or
# devenv tasks. Run from inside the devenv shell (direnv is hooked into
# the directory, so `cd` is enough to activate it).
#
# Discovery:
#   devenv tasks list                # List all tasks (lint:*, db:*, deploy:*, ...)
#   ls $DEVENV_PROFILE/bin           # List all scripts on PATH
#
# Migration map (former make X  →  current devenv command):
#
#   make init               →  なし (devenv shell 進入時に setup:* タスクが
#                                  bun install / uv sync / .env.secrets コピーを自動実行)
#   make run                →  devenv up
#   make stop               →  stop                              (script)
#   make supabase-start     →  supabase-start                    (script)
#   make supabase-stop      →  supabase-stop                     (script)
#   make frontend           →  frontend                          (script)
#   make mobile             →  mobile                            (script)
#   make mobile-ios         →  mobile-ios                        (script)
#   make mobile-android     →  mobile-android                    (script)
#   make mobile-web         →  mobile-web                        (script)
#   make storybook-local    →  storybook-local                   (script)
#   make build-storybook    →  build-storybook                   (script)
#   make build-frontend     →  build-frontend                    (script)
#   make build-mobile-ios   →  build-mobile-ios                  (script)
#   make build-mobile-android → build-mobile-android             (script)
#
#   make lint               →  lint                              (script)
#   make lint-frontend      →  lint-frontend                     (script)
#   make lint-frontend-ci   →  lint-frontend-ci                  (script)
#   make lint-fsd           →  lint-fsd                          (script)
#   make lint-drizzle       →  lint-drizzle                      (script)
#   make lint-drizzle-ci    →  lint-drizzle-ci                   (script)
#   make lint-backend-py    →  lint-backend-py                   (script)
#   make lint-backend-py-ci →  lint-backend-py-ci                (script)
#   make lint-functions     →  lint-functions                    (script)
#
#   make format             →  format                            (script)
#   make format-check       →  format-check                      (script)
#   make format-frontend    →  format-frontend                   (script)
#   make format-frontend-check → format-frontend-check           (script)
#   make format-drizzle     →  format-drizzle                    (script)
#   make format-drizzle-check → format-drizzle-check             (script)
#   make format-backend-py  →  format-backend-py                 (script)
#   make format-backend-py-check → format-backend-py-check       (script)
#   make format-functions   →  format-functions                  (script)
#   make format-functions-check → format-functions-check         (script)
#
#   make type-check         →  type-check                        (script)
#   make type-check-frontend → type-check-frontend               (script)
#   make type-check-mobile  →  type-check-mobile                 (script)
#   make type-check-backend-py → type-check-backend-py           (script)
#   make check-functions    →  check-functions                   (script)
#   make ci-check           →  ci-check                          (script)
#
#   make build-model        →  devenv tasks run model:build
#   make build-model-frontend → devenv tasks run model:frontend
#   make build-model-functions → devenv tasks run model:functions
#
#   make migrate-dev / make migration → devenv tasks run app:migrate-dev
#   make migrate-deploy     →  devenv tasks run db:migrate-deploy
#   make drizzle-push       →  drizzle-push                      (script)
#   make drizzle-studio     →  drizzle-studio                    (script)
#   make drizzle-validate   →  drizzle-validate                  (script)
#
#   make seed               →  devenv tasks run seed:all
#   make seed-db            →  devenv tasks run seed:db
#   make seed-storage       →  devenv tasks run seed:storage
#
#   make deploy-supabase    →  devenv tasks run -P <env> deploy:supabase
#   make deploy-functions   →  devenv tasks run -P <env> deploy:functions
#   make deploy-polar-webhooks → devenv tasks run -P <env> deploy:polar-webhooks
#   make polar-sync         →  devenv tasks run polar:sync
#   make polar-sync-dry     →  devenv tasks run polar:sync-dry
#
#   make e2e                →  e2e                               (script)
#   make e2e-web            →  e2e-web                           (script)
#   make e2e-mobile         →  e2e-mobile                        (script)
#   make test-db            →  test-db                           (script)
#   make check              →  check                             (script)
#
# Environment switching: prefix with `-P <profile>` (local / staging / production)
#   devenv up -P staging
#   devenv tasks run -P production deploy:functions
#
# See devenv.nix for the full list of scripts/tasks/profiles.
# =============================================================================

.PHONY: %
%:
	@echo ""
	@echo "❌ Makefile is deprecated. devenv に移行済みです。"
	@echo ""
	@echo "💡 Try:"
	@echo "   devenv tasks list                # List all tasks"
	@echo "   devenv tasks run <ns:name>       # Run a task (e.g. db:migrate-dev)"
	@echo "   <script-name>                    # Run a script directly (e.g. lint, ci-check, frontend)"
	@echo ""
	@echo "📖 See the migration map in this Makefile, or README.md / .claude/rules/commands.md."
	@echo ""
	@exit 1
