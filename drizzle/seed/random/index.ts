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
  // Add more table refinements as needed
  // ...chatRoomsRefinement(f),
  // ...messagesRefinement(f),
})
