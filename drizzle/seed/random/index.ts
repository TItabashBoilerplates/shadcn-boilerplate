/**
 * Random Data Refinements
 *
 * This module defines how drizzle-seed generates random test data.
 * Use refinements to:
 * - Set the count of records per table
 * - Customize column generation with faker-like functions
 * - Define relationships between tables
 *
 * Available generator functions (f):
 * - f.fullName(), f.firstName(), f.lastName()
 * - f.email()  … 既定で一意（isUnique オプションは無い）
 * - f.phoneNumber({ template: '###-####-####' })
 * - f.streetAddress(), f.city(), f.state(), f.country(), f.postcode()
 * - f.companyName(), f.jobTitle()
 * - f.int({ minValue, maxValue }), f.number({ minValue, maxValue, precision })
 * - f.date({ minDate, maxDate })
 * - f.loremIpsum()
 * - f.valuesFromArray({ values: [...] })
 * - f.weightedRandom([{ weight, value }])
 * - f.default({ defaultValue })
 */
import { type GeneratorFunctions, usersRefinement } from './users'

// Combine all refinements
export const refinements = (f: GeneratorFunctions) => ({
  ...usersRefinement(f),

  // ランダム生成の対象から外す（count: 0）。
  //
  // app_release_policies は **マスタデータ**（seed/master/app-release-policies.ts が入れる）で、
  // 行の中身は CHECK 制約で縛られている（platform は ios/android、版は 3 セグメントの数値、
  // minimum <= latest）。ランダム文字列を入れると制約違反で seed 全体が落ちるし、
  // 仮に通ったとしても **開発中に強制アップデート画面が出て何も触れなくなる**。
  // ⚠️ キーは **schema の export 名**（`appReleasePolicies`）であって
  //    SQL のテーブル名（`app_release_policies`）ではない。間違えると refinement が
  //    無視され、ランダム生成が走って CHECK 制約違反で seed 全体が落ちる（実際に落ちた）。
  appReleasePolicies: { count: 0 },

  // Add more table refinements as needed
  // ...chatRoomsRefinement(f),
  // ...messagesRefinement(f),
})
