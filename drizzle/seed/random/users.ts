/**
 * Users Random Data Refinement
 *
 * Generates random user data for development and testing.
 * The seed number in index.ts ensures deterministic generation.
 */
import type { seed } from 'drizzle-seed'

/**
 * `f` に渡ってくるジェネレータ関数群の型。
 *
 * drizzle-seed は `RefinementsType` も `generatorsFuncsV2` も **export していない**
 * （`import type { RefinementsType } from 'drizzle-seed'` は TS2459 になる）。
 * `getGeneratorsFunctions()` は公開されているが **v1 の型**を返すため、
 * `f.email({ isUnique: true })` のような v2 の引数が型エラーになる。
 *
 * そこで実際の呼び出し口である `seed(...).refine(callback)` の
 * コールバック引数から導出する。これなら公開 API だけで、かつ
 * seed 側がバージョンを上げたときに自動で追従する。
 */
export type GeneratorFunctions = Parameters<Parameters<ReturnType<typeof seed>['refine']>[0]>[0]

export const usersRefinement = (f: GeneratorFunctions) => ({
  // Note: users table has RLS and requires auth.uid() for insert
  // Random seeding may need to be done via service_role or SQL
  // This is a template showing the refinement structure
  users: {
    count: 10,
    columns: {
      displayName: f.fullName(),
      // drizzle-seed の email ジェネレータは既定で一意な値を返すため
      // `isUnique` オプションは存在しない（0.3.1 の型は `{ arraySize?: number }` のみ）
      accountName: f.email(),
    },
  },
})
