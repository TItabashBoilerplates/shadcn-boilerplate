
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Organization
 * 
 */
export type Organization = $Result.DefaultSelection<Prisma.$OrganizationPayload>
/**
 * Model CorporateUser
 * 
 */
export type CorporateUser = $Result.DefaultSelection<Prisma.$CorporateUserPayload>
/**
 * Model GeneralUser
 * 
 */
export type GeneralUser = $Result.DefaultSelection<Prisma.$GeneralUserPayload>
/**
 * Model GeneralUserProfile
 * 
 */
export type GeneralUserProfile = $Result.DefaultSelection<Prisma.$GeneralUserProfilePayload>
/**
 * Model Address
 * 
 */
export type Address = $Result.DefaultSelection<Prisma.$AddressPayload>
/**
 * Model Message
 * 
 */
export type Message = $Result.DefaultSelection<Prisma.$MessagePayload>
/**
 * Model ChatRoom
 * 
 */
export type ChatRoom = $Result.DefaultSelection<Prisma.$ChatRoomPayload>
/**
 * Model UserChat
 * 
 */
export type UserChat = $Result.DefaultSelection<Prisma.$UserChatPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const ChatType: {
  PRIVATE: 'PRIVATE',
  GROUP: 'GROUP'
};

export type ChatType = (typeof ChatType)[keyof typeof ChatType]

}

export type ChatType = $Enums.ChatType

export const ChatType: typeof $Enums.ChatType

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Organizations
 * const organizations = await prisma.organization.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Organizations
   * const organizations = await prisma.organization.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.organization`: Exposes CRUD operations for the **Organization** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Organizations
    * const organizations = await prisma.organization.findMany()
    * ```
    */
  get organization(): Prisma.OrganizationDelegate<ExtArgs>;

  /**
   * `prisma.corporateUser`: Exposes CRUD operations for the **CorporateUser** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CorporateUsers
    * const corporateUsers = await prisma.corporateUser.findMany()
    * ```
    */
  get corporateUser(): Prisma.CorporateUserDelegate<ExtArgs>;

  /**
   * `prisma.generalUser`: Exposes CRUD operations for the **GeneralUser** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GeneralUsers
    * const generalUsers = await prisma.generalUser.findMany()
    * ```
    */
  get generalUser(): Prisma.GeneralUserDelegate<ExtArgs>;

  /**
   * `prisma.generalUserProfile`: Exposes CRUD operations for the **GeneralUserProfile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more GeneralUserProfiles
    * const generalUserProfiles = await prisma.generalUserProfile.findMany()
    * ```
    */
  get generalUserProfile(): Prisma.GeneralUserProfileDelegate<ExtArgs>;

  /**
   * `prisma.address`: Exposes CRUD operations for the **Address** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Addresses
    * const addresses = await prisma.address.findMany()
    * ```
    */
  get address(): Prisma.AddressDelegate<ExtArgs>;

  /**
   * `prisma.message`: Exposes CRUD operations for the **Message** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Messages
    * const messages = await prisma.message.findMany()
    * ```
    */
  get message(): Prisma.MessageDelegate<ExtArgs>;

  /**
   * `prisma.chatRoom`: Exposes CRUD operations for the **ChatRoom** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ChatRooms
    * const chatRooms = await prisma.chatRoom.findMany()
    * ```
    */
  get chatRoom(): Prisma.ChatRoomDelegate<ExtArgs>;

  /**
   * `prisma.userChat`: Exposes CRUD operations for the **UserChat** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserChats
    * const userChats = await prisma.userChat.findMany()
    * ```
    */
  get userChat(): Prisma.UserChatDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.11.0
   * Query Engine version: efd2449663b3d73d637ea1fd226bafbcf45b3102
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown }

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Organization: 'Organization',
    CorporateUser: 'CorporateUser',
    GeneralUser: 'GeneralUser',
    GeneralUserProfile: 'GeneralUserProfile',
    Address: 'Address',
    Message: 'Message',
    ChatRoom: 'ChatRoom',
    UserChat: 'UserChat'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'organization' | 'corporateUser' | 'generalUser' | 'generalUserProfile' | 'address' | 'message' | 'chatRoom' | 'userChat'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      Organization: {
        payload: Prisma.$OrganizationPayload<ExtArgs>
        fields: Prisma.OrganizationFieldRefs
        operations: {
          findUnique: {
            args: Prisma.OrganizationFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.OrganizationFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findFirst: {
            args: Prisma.OrganizationFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.OrganizationFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          findMany: {
            args: Prisma.OrganizationFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>[]
          }
          create: {
            args: Prisma.OrganizationCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          createMany: {
            args: Prisma.OrganizationCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.OrganizationDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          update: {
            args: Prisma.OrganizationUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          deleteMany: {
            args: Prisma.OrganizationDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.OrganizationUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.OrganizationUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$OrganizationPayload>
          }
          aggregate: {
            args: Prisma.OrganizationAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateOrganization>
          }
          groupBy: {
            args: Prisma.OrganizationGroupByArgs<ExtArgs>,
            result: $Utils.Optional<OrganizationGroupByOutputType>[]
          }
          count: {
            args: Prisma.OrganizationCountArgs<ExtArgs>,
            result: $Utils.Optional<OrganizationCountAggregateOutputType> | number
          }
        }
      }
      CorporateUser: {
        payload: Prisma.$CorporateUserPayload<ExtArgs>
        fields: Prisma.CorporateUserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CorporateUserFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CorporateUserFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          findFirst: {
            args: Prisma.CorporateUserFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CorporateUserFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          findMany: {
            args: Prisma.CorporateUserFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>[]
          }
          create: {
            args: Prisma.CorporateUserCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          createMany: {
            args: Prisma.CorporateUserCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.CorporateUserDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          update: {
            args: Prisma.CorporateUserUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          deleteMany: {
            args: Prisma.CorporateUserDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.CorporateUserUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.CorporateUserUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$CorporateUserPayload>
          }
          aggregate: {
            args: Prisma.CorporateUserAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateCorporateUser>
          }
          groupBy: {
            args: Prisma.CorporateUserGroupByArgs<ExtArgs>,
            result: $Utils.Optional<CorporateUserGroupByOutputType>[]
          }
          count: {
            args: Prisma.CorporateUserCountArgs<ExtArgs>,
            result: $Utils.Optional<CorporateUserCountAggregateOutputType> | number
          }
        }
      }
      GeneralUser: {
        payload: Prisma.$GeneralUserPayload<ExtArgs>
        fields: Prisma.GeneralUserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GeneralUserFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GeneralUserFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          findFirst: {
            args: Prisma.GeneralUserFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GeneralUserFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          findMany: {
            args: Prisma.GeneralUserFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>[]
          }
          create: {
            args: Prisma.GeneralUserCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          createMany: {
            args: Prisma.GeneralUserCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.GeneralUserDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          update: {
            args: Prisma.GeneralUserUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          deleteMany: {
            args: Prisma.GeneralUserDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.GeneralUserUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.GeneralUserUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserPayload>
          }
          aggregate: {
            args: Prisma.GeneralUserAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateGeneralUser>
          }
          groupBy: {
            args: Prisma.GeneralUserGroupByArgs<ExtArgs>,
            result: $Utils.Optional<GeneralUserGroupByOutputType>[]
          }
          count: {
            args: Prisma.GeneralUserCountArgs<ExtArgs>,
            result: $Utils.Optional<GeneralUserCountAggregateOutputType> | number
          }
        }
      }
      GeneralUserProfile: {
        payload: Prisma.$GeneralUserProfilePayload<ExtArgs>
        fields: Prisma.GeneralUserProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.GeneralUserProfileFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.GeneralUserProfileFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          findFirst: {
            args: Prisma.GeneralUserProfileFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.GeneralUserProfileFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          findMany: {
            args: Prisma.GeneralUserProfileFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>[]
          }
          create: {
            args: Prisma.GeneralUserProfileCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          createMany: {
            args: Prisma.GeneralUserProfileCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.GeneralUserProfileDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          update: {
            args: Prisma.GeneralUserProfileUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          deleteMany: {
            args: Prisma.GeneralUserProfileDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.GeneralUserProfileUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.GeneralUserProfileUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$GeneralUserProfilePayload>
          }
          aggregate: {
            args: Prisma.GeneralUserProfileAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateGeneralUserProfile>
          }
          groupBy: {
            args: Prisma.GeneralUserProfileGroupByArgs<ExtArgs>,
            result: $Utils.Optional<GeneralUserProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.GeneralUserProfileCountArgs<ExtArgs>,
            result: $Utils.Optional<GeneralUserProfileCountAggregateOutputType> | number
          }
        }
      }
      Address: {
        payload: Prisma.$AddressPayload<ExtArgs>
        fields: Prisma.AddressFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AddressFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AddressFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          findFirst: {
            args: Prisma.AddressFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AddressFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          findMany: {
            args: Prisma.AddressFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>[]
          }
          create: {
            args: Prisma.AddressCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          createMany: {
            args: Prisma.AddressCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.AddressDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          update: {
            args: Prisma.AddressUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          deleteMany: {
            args: Prisma.AddressDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.AddressUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.AddressUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$AddressPayload>
          }
          aggregate: {
            args: Prisma.AddressAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateAddress>
          }
          groupBy: {
            args: Prisma.AddressGroupByArgs<ExtArgs>,
            result: $Utils.Optional<AddressGroupByOutputType>[]
          }
          count: {
            args: Prisma.AddressCountArgs<ExtArgs>,
            result: $Utils.Optional<AddressCountAggregateOutputType> | number
          }
        }
      }
      Message: {
        payload: Prisma.$MessagePayload<ExtArgs>
        fields: Prisma.MessageFieldRefs
        operations: {
          findUnique: {
            args: Prisma.MessageFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.MessageFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          findFirst: {
            args: Prisma.MessageFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.MessageFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          findMany: {
            args: Prisma.MessageFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>[]
          }
          create: {
            args: Prisma.MessageCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          createMany: {
            args: Prisma.MessageCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.MessageDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          update: {
            args: Prisma.MessageUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          deleteMany: {
            args: Prisma.MessageDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.MessageUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.MessageUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$MessagePayload>
          }
          aggregate: {
            args: Prisma.MessageAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateMessage>
          }
          groupBy: {
            args: Prisma.MessageGroupByArgs<ExtArgs>,
            result: $Utils.Optional<MessageGroupByOutputType>[]
          }
          count: {
            args: Prisma.MessageCountArgs<ExtArgs>,
            result: $Utils.Optional<MessageCountAggregateOutputType> | number
          }
        }
      }
      ChatRoom: {
        payload: Prisma.$ChatRoomPayload<ExtArgs>
        fields: Prisma.ChatRoomFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ChatRoomFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ChatRoomFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          findFirst: {
            args: Prisma.ChatRoomFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ChatRoomFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          findMany: {
            args: Prisma.ChatRoomFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>[]
          }
          create: {
            args: Prisma.ChatRoomCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          createMany: {
            args: Prisma.ChatRoomCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.ChatRoomDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          update: {
            args: Prisma.ChatRoomUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          deleteMany: {
            args: Prisma.ChatRoomDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.ChatRoomUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.ChatRoomUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ChatRoomPayload>
          }
          aggregate: {
            args: Prisma.ChatRoomAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateChatRoom>
          }
          groupBy: {
            args: Prisma.ChatRoomGroupByArgs<ExtArgs>,
            result: $Utils.Optional<ChatRoomGroupByOutputType>[]
          }
          count: {
            args: Prisma.ChatRoomCountArgs<ExtArgs>,
            result: $Utils.Optional<ChatRoomCountAggregateOutputType> | number
          }
        }
      }
      UserChat: {
        payload: Prisma.$UserChatPayload<ExtArgs>
        fields: Prisma.UserChatFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserChatFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserChatFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          findFirst: {
            args: Prisma.UserChatFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserChatFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          findMany: {
            args: Prisma.UserChatFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>[]
          }
          create: {
            args: Prisma.UserChatCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          createMany: {
            args: Prisma.UserChatCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.UserChatDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          update: {
            args: Prisma.UserChatUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          deleteMany: {
            args: Prisma.UserChatDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.UserChatUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.UserChatUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$UserChatPayload>
          }
          aggregate: {
            args: Prisma.UserChatAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateUserChat>
          }
          groupBy: {
            args: Prisma.UserChatGroupByArgs<ExtArgs>,
            result: $Utils.Optional<UserChatGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserChatCountArgs<ExtArgs>,
            result: $Utils.Optional<UserChatCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type OrganizationCountOutputType
   */

  export type OrganizationCountOutputType = {
    users: number
  }

  export type OrganizationCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | OrganizationCountOutputTypeCountUsersArgs
  }

  // Custom InputTypes

  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the OrganizationCountOutputType
     */
    select?: OrganizationCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * OrganizationCountOutputType without action
   */
  export type OrganizationCountOutputTypeCountUsersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CorporateUserWhereInput
  }



  /**
   * Count Type GeneralUserCountOutputType
   */

  export type GeneralUserCountOutputType = {
    Message: number
    UserChat: number
  }

  export type GeneralUserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    Message?: boolean | GeneralUserCountOutputTypeCountMessageArgs
    UserChat?: boolean | GeneralUserCountOutputTypeCountUserChatArgs
  }

  // Custom InputTypes

  /**
   * GeneralUserCountOutputType without action
   */
  export type GeneralUserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserCountOutputType
     */
    select?: GeneralUserCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * GeneralUserCountOutputType without action
   */
  export type GeneralUserCountOutputTypeCountMessageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
  }


  /**
   * GeneralUserCountOutputType without action
   */
  export type GeneralUserCountOutputTypeCountUserChatArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserChatWhereInput
  }



  /**
   * Count Type ChatRoomCountOutputType
   */

  export type ChatRoomCountOutputType = {
    messages: number
    userChats: number
  }

  export type ChatRoomCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | ChatRoomCountOutputTypeCountMessagesArgs
    userChats?: boolean | ChatRoomCountOutputTypeCountUserChatsArgs
  }

  // Custom InputTypes

  /**
   * ChatRoomCountOutputType without action
   */
  export type ChatRoomCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoomCountOutputType
     */
    select?: ChatRoomCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * ChatRoomCountOutputType without action
   */
  export type ChatRoomCountOutputTypeCountMessagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
  }


  /**
   * ChatRoomCountOutputType without action
   */
  export type ChatRoomCountOutputTypeCountUserChatsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserChatWhereInput
  }



  /**
   * Models
   */

  /**
   * Model Organization
   */

  export type AggregateOrganization = {
    _count: OrganizationCountAggregateOutputType | null
    _avg: OrganizationAvgAggregateOutputType | null
    _sum: OrganizationSumAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  export type OrganizationAvgAggregateOutputType = {
    id: number | null
  }

  export type OrganizationSumAggregateOutputType = {
    id: number | null
  }

  export type OrganizationMinAggregateOutputType = {
    id: number | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrganizationMaxAggregateOutputType = {
    id: number | null
    name: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type OrganizationCountAggregateOutputType = {
    id: number
    name: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type OrganizationAvgAggregateInputType = {
    id?: true
  }

  export type OrganizationSumAggregateInputType = {
    id?: true
  }

  export type OrganizationMinAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrganizationMaxAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
  }

  export type OrganizationCountAggregateInputType = {
    id?: true
    name?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type OrganizationAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organization to aggregate.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Organizations
    **/
    _count?: true | OrganizationCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: OrganizationAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: OrganizationSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: OrganizationMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: OrganizationMaxAggregateInputType
  }

  export type GetOrganizationAggregateType<T extends OrganizationAggregateArgs> = {
        [P in keyof T & keyof AggregateOrganization]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateOrganization[P]>
      : GetScalarType<T[P], AggregateOrganization[P]>
  }




  export type OrganizationGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: OrganizationWhereInput
    orderBy?: OrganizationOrderByWithAggregationInput | OrganizationOrderByWithAggregationInput[]
    by: OrganizationScalarFieldEnum[] | OrganizationScalarFieldEnum
    having?: OrganizationScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: OrganizationCountAggregateInputType | true
    _avg?: OrganizationAvgAggregateInputType
    _sum?: OrganizationSumAggregateInputType
    _min?: OrganizationMinAggregateInputType
    _max?: OrganizationMaxAggregateInputType
  }

  export type OrganizationGroupByOutputType = {
    id: number
    name: string
    createdAt: Date
    updatedAt: Date
    _count: OrganizationCountAggregateOutputType | null
    _avg: OrganizationAvgAggregateOutputType | null
    _sum: OrganizationSumAggregateOutputType | null
    _min: OrganizationMinAggregateOutputType | null
    _max: OrganizationMaxAggregateOutputType | null
  }

  type GetOrganizationGroupByPayload<T extends OrganizationGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<OrganizationGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof OrganizationGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
            : GetScalarType<T[P], OrganizationGroupByOutputType[P]>
        }
      >
    >


  export type OrganizationSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    users?: boolean | Organization$usersArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["organization"]>

  export type OrganizationSelectScalar = {
    id?: boolean
    name?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type OrganizationInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    users?: boolean | Organization$usersArgs<ExtArgs>
    _count?: boolean | OrganizationCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $OrganizationPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Organization"
    objects: {
      users: Prisma.$CorporateUserPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["organization"]>
    composites: {}
  }


  type OrganizationGetPayload<S extends boolean | null | undefined | OrganizationDefaultArgs> = $Result.GetResult<Prisma.$OrganizationPayload, S>

  type OrganizationCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<OrganizationFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: OrganizationCountAggregateInputType | true
    }

  export interface OrganizationDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Organization'], meta: { name: 'Organization' } }
    /**
     * Find zero or one Organization that matches the filter.
     * @param {OrganizationFindUniqueArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends OrganizationFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationFindUniqueArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Organization that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {OrganizationFindUniqueOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends OrganizationFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Organization that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends OrganizationFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindFirstArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Organization that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindFirstOrThrowArgs} args - Arguments to find a Organization
     * @example
     * // Get one Organization
     * const organization = await prisma.organization.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends OrganizationFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Organizations that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Organizations
     * const organizations = await prisma.organization.findMany()
     * 
     * // Get first 10 Organizations
     * const organizations = await prisma.organization.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const organizationWithIdOnly = await prisma.organization.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends OrganizationFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Organization.
     * @param {OrganizationCreateArgs} args - Arguments to create a Organization.
     * @example
     * // Create one Organization
     * const Organization = await prisma.organization.create({
     *   data: {
     *     // ... data to create a Organization
     *   }
     * })
     * 
    **/
    create<T extends OrganizationCreateArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationCreateArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Organizations.
     *     @param {OrganizationCreateManyArgs} args - Arguments to create many Organizations.
     *     @example
     *     // Create many Organizations
     *     const organization = await prisma.organization.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends OrganizationCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Organization.
     * @param {OrganizationDeleteArgs} args - Arguments to delete one Organization.
     * @example
     * // Delete one Organization
     * const Organization = await prisma.organization.delete({
     *   where: {
     *     // ... filter to delete one Organization
     *   }
     * })
     * 
    **/
    delete<T extends OrganizationDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationDeleteArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Organization.
     * @param {OrganizationUpdateArgs} args - Arguments to update one Organization.
     * @example
     * // Update one Organization
     * const organization = await prisma.organization.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends OrganizationUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpdateArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Organizations.
     * @param {OrganizationDeleteManyArgs} args - Arguments to filter Organizations to delete.
     * @example
     * // Delete a few Organizations
     * const { count } = await prisma.organization.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends OrganizationDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, OrganizationDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Organizations
     * const organization = await prisma.organization.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends OrganizationUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Organization.
     * @param {OrganizationUpsertArgs} args - Arguments to update or create a Organization.
     * @example
     * // Update or create a Organization
     * const organization = await prisma.organization.upsert({
     *   create: {
     *     // ... data to create a Organization
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Organization we want to update
     *   }
     * })
    **/
    upsert<T extends OrganizationUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, OrganizationUpsertArgs<ExtArgs>>
    ): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Organizations.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationCountArgs} args - Arguments to filter Organizations to count.
     * @example
     * // Count the number of Organizations
     * const count = await prisma.organization.count({
     *   where: {
     *     // ... the filter for the Organizations we want to count
     *   }
     * })
    **/
    count<T extends OrganizationCountArgs>(
      args?: Subset<T, OrganizationCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], OrganizationCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends OrganizationAggregateArgs>(args: Subset<T, OrganizationAggregateArgs>): Prisma.PrismaPromise<GetOrganizationAggregateType<T>>

    /**
     * Group by Organization.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {OrganizationGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends OrganizationGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: OrganizationGroupByArgs['orderBy'] }
        : { orderBy?: OrganizationGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, OrganizationGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetOrganizationGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Organization model
   */
  readonly fields: OrganizationFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Organization.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__OrganizationClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    users<T extends Organization$usersArgs<ExtArgs> = {}>(args?: Subset<T, Organization$usersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Organization model
   */ 
  interface OrganizationFieldRefs {
    readonly id: FieldRef<"Organization", 'Int'>
    readonly name: FieldRef<"Organization", 'String'>
    readonly createdAt: FieldRef<"Organization", 'DateTime'>
    readonly updatedAt: FieldRef<"Organization", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * Organization findUnique
   */
  export type OrganizationFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization findUniqueOrThrow
   */
  export type OrganizationFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization findFirst
   */
  export type OrganizationFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization findFirstOrThrow
   */
  export type OrganizationFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organization to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Organizations.
     */
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization findMany
   */
  export type OrganizationFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter, which Organizations to fetch.
     */
    where?: OrganizationWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Organizations to fetch.
     */
    orderBy?: OrganizationOrderByWithRelationInput | OrganizationOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Organizations.
     */
    cursor?: OrganizationWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Organizations from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Organizations.
     */
    skip?: number
    distinct?: OrganizationScalarFieldEnum | OrganizationScalarFieldEnum[]
  }


  /**
   * Organization create
   */
  export type OrganizationCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to create a Organization.
     */
    data: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
  }


  /**
   * Organization createMany
   */
  export type OrganizationCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Organizations.
     */
    data: OrganizationCreateManyInput | OrganizationCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Organization update
   */
  export type OrganizationUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The data needed to update a Organization.
     */
    data: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
    /**
     * Choose, which Organization to update.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization updateMany
   */
  export type OrganizationUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Organizations.
     */
    data: XOR<OrganizationUpdateManyMutationInput, OrganizationUncheckedUpdateManyInput>
    /**
     * Filter which Organizations to update
     */
    where?: OrganizationWhereInput
  }


  /**
   * Organization upsert
   */
  export type OrganizationUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * The filter to search for the Organization to update in case it exists.
     */
    where: OrganizationWhereUniqueInput
    /**
     * In case the Organization found by the `where` argument doesn't exist, create a new Organization with this data.
     */
    create: XOR<OrganizationCreateInput, OrganizationUncheckedCreateInput>
    /**
     * In case the Organization was found with the provided `where` argument, update it with this data.
     */
    update: XOR<OrganizationUpdateInput, OrganizationUncheckedUpdateInput>
  }


  /**
   * Organization delete
   */
  export type OrganizationDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
    /**
     * Filter which Organization to delete.
     */
    where: OrganizationWhereUniqueInput
  }


  /**
   * Organization deleteMany
   */
  export type OrganizationDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Organizations to delete
     */
    where?: OrganizationWhereInput
  }


  /**
   * Organization.users
   */
  export type Organization$usersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    where?: CorporateUserWhereInput
    orderBy?: CorporateUserOrderByWithRelationInput | CorporateUserOrderByWithRelationInput[]
    cursor?: CorporateUserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CorporateUserScalarFieldEnum | CorporateUserScalarFieldEnum[]
  }


  /**
   * Organization without action
   */
  export type OrganizationDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Organization
     */
    select?: OrganizationSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: OrganizationInclude<ExtArgs> | null
  }



  /**
   * Model CorporateUser
   */

  export type AggregateCorporateUser = {
    _count: CorporateUserCountAggregateOutputType | null
    _avg: CorporateUserAvgAggregateOutputType | null
    _sum: CorporateUserSumAggregateOutputType | null
    _min: CorporateUserMinAggregateOutputType | null
    _max: CorporateUserMaxAggregateOutputType | null
  }

  export type CorporateUserAvgAggregateOutputType = {
    id: number | null
    organizationId: number | null
  }

  export type CorporateUserSumAggregateOutputType = {
    id: number | null
    organizationId: number | null
  }

  export type CorporateUserMinAggregateOutputType = {
    id: number | null
    uuid: string | null
    name: string | null
    organizationId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CorporateUserMaxAggregateOutputType = {
    id: number | null
    uuid: string | null
    name: string | null
    organizationId: number | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CorporateUserCountAggregateOutputType = {
    id: number
    uuid: number
    name: number
    organizationId: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CorporateUserAvgAggregateInputType = {
    id?: true
    organizationId?: true
  }

  export type CorporateUserSumAggregateInputType = {
    id?: true
    organizationId?: true
  }

  export type CorporateUserMinAggregateInputType = {
    id?: true
    uuid?: true
    name?: true
    organizationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CorporateUserMaxAggregateInputType = {
    id?: true
    uuid?: true
    name?: true
    organizationId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CorporateUserCountAggregateInputType = {
    id?: true
    uuid?: true
    name?: true
    organizationId?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CorporateUserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CorporateUser to aggregate.
     */
    where?: CorporateUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CorporateUsers to fetch.
     */
    orderBy?: CorporateUserOrderByWithRelationInput | CorporateUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CorporateUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CorporateUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CorporateUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CorporateUsers
    **/
    _count?: true | CorporateUserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CorporateUserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CorporateUserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CorporateUserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CorporateUserMaxAggregateInputType
  }

  export type GetCorporateUserAggregateType<T extends CorporateUserAggregateArgs> = {
        [P in keyof T & keyof AggregateCorporateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCorporateUser[P]>
      : GetScalarType<T[P], AggregateCorporateUser[P]>
  }




  export type CorporateUserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CorporateUserWhereInput
    orderBy?: CorporateUserOrderByWithAggregationInput | CorporateUserOrderByWithAggregationInput[]
    by: CorporateUserScalarFieldEnum[] | CorporateUserScalarFieldEnum
    having?: CorporateUserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CorporateUserCountAggregateInputType | true
    _avg?: CorporateUserAvgAggregateInputType
    _sum?: CorporateUserSumAggregateInputType
    _min?: CorporateUserMinAggregateInputType
    _max?: CorporateUserMaxAggregateInputType
  }

  export type CorporateUserGroupByOutputType = {
    id: number
    uuid: string
    name: string
    organizationId: number
    createdAt: Date
    updatedAt: Date
    _count: CorporateUserCountAggregateOutputType | null
    _avg: CorporateUserAvgAggregateOutputType | null
    _sum: CorporateUserSumAggregateOutputType | null
    _min: CorporateUserMinAggregateOutputType | null
    _max: CorporateUserMaxAggregateOutputType | null
  }

  type GetCorporateUserGroupByPayload<T extends CorporateUserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CorporateUserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CorporateUserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CorporateUserGroupByOutputType[P]>
            : GetScalarType<T[P], CorporateUserGroupByOutputType[P]>
        }
      >
    >


  export type CorporateUserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uuid?: boolean
    name?: boolean
    organizationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["corporateUser"]>

  export type CorporateUserSelectScalar = {
    id?: boolean
    uuid?: boolean
    name?: boolean
    organizationId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CorporateUserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    organization?: boolean | OrganizationDefaultArgs<ExtArgs>
  }


  export type $CorporateUserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CorporateUser"
    objects: {
      organization: Prisma.$OrganizationPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      uuid: string
      name: string
      organizationId: number
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["corporateUser"]>
    composites: {}
  }


  type CorporateUserGetPayload<S extends boolean | null | undefined | CorporateUserDefaultArgs> = $Result.GetResult<Prisma.$CorporateUserPayload, S>

  type CorporateUserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<CorporateUserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: CorporateUserCountAggregateInputType | true
    }

  export interface CorporateUserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CorporateUser'], meta: { name: 'CorporateUser' } }
    /**
     * Find zero or one CorporateUser that matches the filter.
     * @param {CorporateUserFindUniqueArgs} args - Arguments to find a CorporateUser
     * @example
     * // Get one CorporateUser
     * const corporateUser = await prisma.corporateUser.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends CorporateUserFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserFindUniqueArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one CorporateUser that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {CorporateUserFindUniqueOrThrowArgs} args - Arguments to find a CorporateUser
     * @example
     * // Get one CorporateUser
     * const corporateUser = await prisma.corporateUser.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends CorporateUserFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first CorporateUser that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserFindFirstArgs} args - Arguments to find a CorporateUser
     * @example
     * // Get one CorporateUser
     * const corporateUser = await prisma.corporateUser.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends CorporateUserFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserFindFirstArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first CorporateUser that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserFindFirstOrThrowArgs} args - Arguments to find a CorporateUser
     * @example
     * // Get one CorporateUser
     * const corporateUser = await prisma.corporateUser.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends CorporateUserFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more CorporateUsers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CorporateUsers
     * const corporateUsers = await prisma.corporateUser.findMany()
     * 
     * // Get first 10 CorporateUsers
     * const corporateUsers = await prisma.corporateUser.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const corporateUserWithIdOnly = await prisma.corporateUser.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends CorporateUserFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a CorporateUser.
     * @param {CorporateUserCreateArgs} args - Arguments to create a CorporateUser.
     * @example
     * // Create one CorporateUser
     * const CorporateUser = await prisma.corporateUser.create({
     *   data: {
     *     // ... data to create a CorporateUser
     *   }
     * })
     * 
    **/
    create<T extends CorporateUserCreateArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserCreateArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many CorporateUsers.
     *     @param {CorporateUserCreateManyArgs} args - Arguments to create many CorporateUsers.
     *     @example
     *     // Create many CorporateUsers
     *     const corporateUser = await prisma.corporateUser.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends CorporateUserCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a CorporateUser.
     * @param {CorporateUserDeleteArgs} args - Arguments to delete one CorporateUser.
     * @example
     * // Delete one CorporateUser
     * const CorporateUser = await prisma.corporateUser.delete({
     *   where: {
     *     // ... filter to delete one CorporateUser
     *   }
     * })
     * 
    **/
    delete<T extends CorporateUserDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserDeleteArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one CorporateUser.
     * @param {CorporateUserUpdateArgs} args - Arguments to update one CorporateUser.
     * @example
     * // Update one CorporateUser
     * const corporateUser = await prisma.corporateUser.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends CorporateUserUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserUpdateArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more CorporateUsers.
     * @param {CorporateUserDeleteManyArgs} args - Arguments to filter CorporateUsers to delete.
     * @example
     * // Delete a few CorporateUsers
     * const { count } = await prisma.corporateUser.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends CorporateUserDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, CorporateUserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CorporateUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CorporateUsers
     * const corporateUser = await prisma.corporateUser.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends CorporateUserUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one CorporateUser.
     * @param {CorporateUserUpsertArgs} args - Arguments to update or create a CorporateUser.
     * @example
     * // Update or create a CorporateUser
     * const corporateUser = await prisma.corporateUser.upsert({
     *   create: {
     *     // ... data to create a CorporateUser
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CorporateUser we want to update
     *   }
     * })
    **/
    upsert<T extends CorporateUserUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, CorporateUserUpsertArgs<ExtArgs>>
    ): Prisma__CorporateUserClient<$Result.GetResult<Prisma.$CorporateUserPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of CorporateUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserCountArgs} args - Arguments to filter CorporateUsers to count.
     * @example
     * // Count the number of CorporateUsers
     * const count = await prisma.corporateUser.count({
     *   where: {
     *     // ... the filter for the CorporateUsers we want to count
     *   }
     * })
    **/
    count<T extends CorporateUserCountArgs>(
      args?: Subset<T, CorporateUserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CorporateUserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CorporateUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CorporateUserAggregateArgs>(args: Subset<T, CorporateUserAggregateArgs>): Prisma.PrismaPromise<GetCorporateUserAggregateType<T>>

    /**
     * Group by CorporateUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CorporateUserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CorporateUserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CorporateUserGroupByArgs['orderBy'] }
        : { orderBy?: CorporateUserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CorporateUserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCorporateUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CorporateUser model
   */
  readonly fields: CorporateUserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CorporateUser.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CorporateUserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    organization<T extends OrganizationDefaultArgs<ExtArgs> = {}>(args?: Subset<T, OrganizationDefaultArgs<ExtArgs>>): Prisma__OrganizationClient<$Result.GetResult<Prisma.$OrganizationPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the CorporateUser model
   */ 
  interface CorporateUserFieldRefs {
    readonly id: FieldRef<"CorporateUser", 'Int'>
    readonly uuid: FieldRef<"CorporateUser", 'String'>
    readonly name: FieldRef<"CorporateUser", 'String'>
    readonly organizationId: FieldRef<"CorporateUser", 'Int'>
    readonly createdAt: FieldRef<"CorporateUser", 'DateTime'>
    readonly updatedAt: FieldRef<"CorporateUser", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * CorporateUser findUnique
   */
  export type CorporateUserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter, which CorporateUser to fetch.
     */
    where: CorporateUserWhereUniqueInput
  }


  /**
   * CorporateUser findUniqueOrThrow
   */
  export type CorporateUserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter, which CorporateUser to fetch.
     */
    where: CorporateUserWhereUniqueInput
  }


  /**
   * CorporateUser findFirst
   */
  export type CorporateUserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter, which CorporateUser to fetch.
     */
    where?: CorporateUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CorporateUsers to fetch.
     */
    orderBy?: CorporateUserOrderByWithRelationInput | CorporateUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CorporateUsers.
     */
    cursor?: CorporateUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CorporateUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CorporateUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CorporateUsers.
     */
    distinct?: CorporateUserScalarFieldEnum | CorporateUserScalarFieldEnum[]
  }


  /**
   * CorporateUser findFirstOrThrow
   */
  export type CorporateUserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter, which CorporateUser to fetch.
     */
    where?: CorporateUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CorporateUsers to fetch.
     */
    orderBy?: CorporateUserOrderByWithRelationInput | CorporateUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CorporateUsers.
     */
    cursor?: CorporateUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CorporateUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CorporateUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CorporateUsers.
     */
    distinct?: CorporateUserScalarFieldEnum | CorporateUserScalarFieldEnum[]
  }


  /**
   * CorporateUser findMany
   */
  export type CorporateUserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter, which CorporateUsers to fetch.
     */
    where?: CorporateUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CorporateUsers to fetch.
     */
    orderBy?: CorporateUserOrderByWithRelationInput | CorporateUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CorporateUsers.
     */
    cursor?: CorporateUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CorporateUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CorporateUsers.
     */
    skip?: number
    distinct?: CorporateUserScalarFieldEnum | CorporateUserScalarFieldEnum[]
  }


  /**
   * CorporateUser create
   */
  export type CorporateUserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * The data needed to create a CorporateUser.
     */
    data: XOR<CorporateUserCreateInput, CorporateUserUncheckedCreateInput>
  }


  /**
   * CorporateUser createMany
   */
  export type CorporateUserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CorporateUsers.
     */
    data: CorporateUserCreateManyInput | CorporateUserCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * CorporateUser update
   */
  export type CorporateUserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * The data needed to update a CorporateUser.
     */
    data: XOR<CorporateUserUpdateInput, CorporateUserUncheckedUpdateInput>
    /**
     * Choose, which CorporateUser to update.
     */
    where: CorporateUserWhereUniqueInput
  }


  /**
   * CorporateUser updateMany
   */
  export type CorporateUserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CorporateUsers.
     */
    data: XOR<CorporateUserUpdateManyMutationInput, CorporateUserUncheckedUpdateManyInput>
    /**
     * Filter which CorporateUsers to update
     */
    where?: CorporateUserWhereInput
  }


  /**
   * CorporateUser upsert
   */
  export type CorporateUserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * The filter to search for the CorporateUser to update in case it exists.
     */
    where: CorporateUserWhereUniqueInput
    /**
     * In case the CorporateUser found by the `where` argument doesn't exist, create a new CorporateUser with this data.
     */
    create: XOR<CorporateUserCreateInput, CorporateUserUncheckedCreateInput>
    /**
     * In case the CorporateUser was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CorporateUserUpdateInput, CorporateUserUncheckedUpdateInput>
  }


  /**
   * CorporateUser delete
   */
  export type CorporateUserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
    /**
     * Filter which CorporateUser to delete.
     */
    where: CorporateUserWhereUniqueInput
  }


  /**
   * CorporateUser deleteMany
   */
  export type CorporateUserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CorporateUsers to delete
     */
    where?: CorporateUserWhereInput
  }


  /**
   * CorporateUser without action
   */
  export type CorporateUserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CorporateUser
     */
    select?: CorporateUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: CorporateUserInclude<ExtArgs> | null
  }



  /**
   * Model GeneralUser
   */

  export type AggregateGeneralUser = {
    _count: GeneralUserCountAggregateOutputType | null
    _avg: GeneralUserAvgAggregateOutputType | null
    _sum: GeneralUserSumAggregateOutputType | null
    _min: GeneralUserMinAggregateOutputType | null
    _max: GeneralUserMaxAggregateOutputType | null
  }

  export type GeneralUserAvgAggregateOutputType = {
    id: number | null
  }

  export type GeneralUserSumAggregateOutputType = {
    id: number | null
  }

  export type GeneralUserMinAggregateOutputType = {
    id: number | null
    uuid: string | null
    displayName: string | null
    accountName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GeneralUserMaxAggregateOutputType = {
    id: number | null
    uuid: string | null
    displayName: string | null
    accountName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type GeneralUserCountAggregateOutputType = {
    id: number
    uuid: number
    displayName: number
    accountName: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type GeneralUserAvgAggregateInputType = {
    id?: true
  }

  export type GeneralUserSumAggregateInputType = {
    id?: true
  }

  export type GeneralUserMinAggregateInputType = {
    id?: true
    uuid?: true
    displayName?: true
    accountName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GeneralUserMaxAggregateInputType = {
    id?: true
    uuid?: true
    displayName?: true
    accountName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type GeneralUserCountAggregateInputType = {
    id?: true
    uuid?: true
    displayName?: true
    accountName?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type GeneralUserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeneralUser to aggregate.
     */
    where?: GeneralUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUsers to fetch.
     */
    orderBy?: GeneralUserOrderByWithRelationInput | GeneralUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GeneralUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GeneralUsers
    **/
    _count?: true | GeneralUserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GeneralUserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GeneralUserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GeneralUserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GeneralUserMaxAggregateInputType
  }

  export type GetGeneralUserAggregateType<T extends GeneralUserAggregateArgs> = {
        [P in keyof T & keyof AggregateGeneralUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGeneralUser[P]>
      : GetScalarType<T[P], AggregateGeneralUser[P]>
  }




  export type GeneralUserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GeneralUserWhereInput
    orderBy?: GeneralUserOrderByWithAggregationInput | GeneralUserOrderByWithAggregationInput[]
    by: GeneralUserScalarFieldEnum[] | GeneralUserScalarFieldEnum
    having?: GeneralUserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GeneralUserCountAggregateInputType | true
    _avg?: GeneralUserAvgAggregateInputType
    _sum?: GeneralUserSumAggregateInputType
    _min?: GeneralUserMinAggregateInputType
    _max?: GeneralUserMaxAggregateInputType
  }

  export type GeneralUserGroupByOutputType = {
    id: number
    uuid: string
    displayName: string
    accountName: string
    createdAt: Date
    updatedAt: Date
    _count: GeneralUserCountAggregateOutputType | null
    _avg: GeneralUserAvgAggregateOutputType | null
    _sum: GeneralUserSumAggregateOutputType | null
    _min: GeneralUserMinAggregateOutputType | null
    _max: GeneralUserMaxAggregateOutputType | null
  }

  type GetGeneralUserGroupByPayload<T extends GeneralUserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GeneralUserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GeneralUserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GeneralUserGroupByOutputType[P]>
            : GetScalarType<T[P], GeneralUserGroupByOutputType[P]>
        }
      >
    >


  export type GeneralUserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uuid?: boolean
    displayName?: boolean
    accountName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    profile?: boolean | GeneralUser$profileArgs<ExtArgs>
    Message?: boolean | GeneralUser$MessageArgs<ExtArgs>
    UserChat?: boolean | GeneralUser$UserChatArgs<ExtArgs>
    _count?: boolean | GeneralUserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["generalUser"]>

  export type GeneralUserSelectScalar = {
    id?: boolean
    uuid?: boolean
    displayName?: boolean
    accountName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type GeneralUserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    profile?: boolean | GeneralUser$profileArgs<ExtArgs>
    Message?: boolean | GeneralUser$MessageArgs<ExtArgs>
    UserChat?: boolean | GeneralUser$UserChatArgs<ExtArgs>
    _count?: boolean | GeneralUserCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $GeneralUserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GeneralUser"
    objects: {
      profile: Prisma.$GeneralUserProfilePayload<ExtArgs> | null
      Message: Prisma.$MessagePayload<ExtArgs>[]
      UserChat: Prisma.$UserChatPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      uuid: string
      displayName: string
      accountName: string
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["generalUser"]>
    composites: {}
  }


  type GeneralUserGetPayload<S extends boolean | null | undefined | GeneralUserDefaultArgs> = $Result.GetResult<Prisma.$GeneralUserPayload, S>

  type GeneralUserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<GeneralUserFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: GeneralUserCountAggregateInputType | true
    }

  export interface GeneralUserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GeneralUser'], meta: { name: 'GeneralUser' } }
    /**
     * Find zero or one GeneralUser that matches the filter.
     * @param {GeneralUserFindUniqueArgs} args - Arguments to find a GeneralUser
     * @example
     * // Get one GeneralUser
     * const generalUser = await prisma.generalUser.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends GeneralUserFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserFindUniqueArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one GeneralUser that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {GeneralUserFindUniqueOrThrowArgs} args - Arguments to find a GeneralUser
     * @example
     * // Get one GeneralUser
     * const generalUser = await prisma.generalUser.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends GeneralUserFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first GeneralUser that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserFindFirstArgs} args - Arguments to find a GeneralUser
     * @example
     * // Get one GeneralUser
     * const generalUser = await prisma.generalUser.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends GeneralUserFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserFindFirstArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first GeneralUser that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserFindFirstOrThrowArgs} args - Arguments to find a GeneralUser
     * @example
     * // Get one GeneralUser
     * const generalUser = await prisma.generalUser.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends GeneralUserFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more GeneralUsers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GeneralUsers
     * const generalUsers = await prisma.generalUser.findMany()
     * 
     * // Get first 10 GeneralUsers
     * const generalUsers = await prisma.generalUser.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const generalUserWithIdOnly = await prisma.generalUser.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends GeneralUserFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a GeneralUser.
     * @param {GeneralUserCreateArgs} args - Arguments to create a GeneralUser.
     * @example
     * // Create one GeneralUser
     * const GeneralUser = await prisma.generalUser.create({
     *   data: {
     *     // ... data to create a GeneralUser
     *   }
     * })
     * 
    **/
    create<T extends GeneralUserCreateArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserCreateArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many GeneralUsers.
     *     @param {GeneralUserCreateManyArgs} args - Arguments to create many GeneralUsers.
     *     @example
     *     // Create many GeneralUsers
     *     const generalUser = await prisma.generalUser.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends GeneralUserCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a GeneralUser.
     * @param {GeneralUserDeleteArgs} args - Arguments to delete one GeneralUser.
     * @example
     * // Delete one GeneralUser
     * const GeneralUser = await prisma.generalUser.delete({
     *   where: {
     *     // ... filter to delete one GeneralUser
     *   }
     * })
     * 
    **/
    delete<T extends GeneralUserDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserDeleteArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one GeneralUser.
     * @param {GeneralUserUpdateArgs} args - Arguments to update one GeneralUser.
     * @example
     * // Update one GeneralUser
     * const generalUser = await prisma.generalUser.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends GeneralUserUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserUpdateArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more GeneralUsers.
     * @param {GeneralUserDeleteManyArgs} args - Arguments to filter GeneralUsers to delete.
     * @example
     * // Delete a few GeneralUsers
     * const { count } = await prisma.generalUser.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends GeneralUserDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GeneralUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GeneralUsers
     * const generalUser = await prisma.generalUser.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends GeneralUserUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one GeneralUser.
     * @param {GeneralUserUpsertArgs} args - Arguments to update or create a GeneralUser.
     * @example
     * // Update or create a GeneralUser
     * const generalUser = await prisma.generalUser.upsert({
     *   create: {
     *     // ... data to create a GeneralUser
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GeneralUser we want to update
     *   }
     * })
    **/
    upsert<T extends GeneralUserUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserUpsertArgs<ExtArgs>>
    ): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of GeneralUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserCountArgs} args - Arguments to filter GeneralUsers to count.
     * @example
     * // Count the number of GeneralUsers
     * const count = await prisma.generalUser.count({
     *   where: {
     *     // ... the filter for the GeneralUsers we want to count
     *   }
     * })
    **/
    count<T extends GeneralUserCountArgs>(
      args?: Subset<T, GeneralUserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GeneralUserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GeneralUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GeneralUserAggregateArgs>(args: Subset<T, GeneralUserAggregateArgs>): Prisma.PrismaPromise<GetGeneralUserAggregateType<T>>

    /**
     * Group by GeneralUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GeneralUserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GeneralUserGroupByArgs['orderBy'] }
        : { orderBy?: GeneralUserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GeneralUserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGeneralUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GeneralUser model
   */
  readonly fields: GeneralUserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GeneralUser.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GeneralUserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    profile<T extends GeneralUser$profileArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUser$profileArgs<ExtArgs>>): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    Message<T extends GeneralUser$MessageArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUser$MessageArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findMany'> | Null>;

    UserChat<T extends GeneralUser$UserChatArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUser$UserChatArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the GeneralUser model
   */ 
  interface GeneralUserFieldRefs {
    readonly id: FieldRef<"GeneralUser", 'Int'>
    readonly uuid: FieldRef<"GeneralUser", 'String'>
    readonly displayName: FieldRef<"GeneralUser", 'String'>
    readonly accountName: FieldRef<"GeneralUser", 'String'>
    readonly createdAt: FieldRef<"GeneralUser", 'DateTime'>
    readonly updatedAt: FieldRef<"GeneralUser", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * GeneralUser findUnique
   */
  export type GeneralUserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUser to fetch.
     */
    where: GeneralUserWhereUniqueInput
  }


  /**
   * GeneralUser findUniqueOrThrow
   */
  export type GeneralUserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUser to fetch.
     */
    where: GeneralUserWhereUniqueInput
  }


  /**
   * GeneralUser findFirst
   */
  export type GeneralUserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUser to fetch.
     */
    where?: GeneralUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUsers to fetch.
     */
    orderBy?: GeneralUserOrderByWithRelationInput | GeneralUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeneralUsers.
     */
    cursor?: GeneralUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeneralUsers.
     */
    distinct?: GeneralUserScalarFieldEnum | GeneralUserScalarFieldEnum[]
  }


  /**
   * GeneralUser findFirstOrThrow
   */
  export type GeneralUserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUser to fetch.
     */
    where?: GeneralUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUsers to fetch.
     */
    orderBy?: GeneralUserOrderByWithRelationInput | GeneralUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeneralUsers.
     */
    cursor?: GeneralUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeneralUsers.
     */
    distinct?: GeneralUserScalarFieldEnum | GeneralUserScalarFieldEnum[]
  }


  /**
   * GeneralUser findMany
   */
  export type GeneralUserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUsers to fetch.
     */
    where?: GeneralUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUsers to fetch.
     */
    orderBy?: GeneralUserOrderByWithRelationInput | GeneralUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GeneralUsers.
     */
    cursor?: GeneralUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUsers.
     */
    skip?: number
    distinct?: GeneralUserScalarFieldEnum | GeneralUserScalarFieldEnum[]
  }


  /**
   * GeneralUser create
   */
  export type GeneralUserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * The data needed to create a GeneralUser.
     */
    data: XOR<GeneralUserCreateInput, GeneralUserUncheckedCreateInput>
  }


  /**
   * GeneralUser createMany
   */
  export type GeneralUserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GeneralUsers.
     */
    data: GeneralUserCreateManyInput | GeneralUserCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * GeneralUser update
   */
  export type GeneralUserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * The data needed to update a GeneralUser.
     */
    data: XOR<GeneralUserUpdateInput, GeneralUserUncheckedUpdateInput>
    /**
     * Choose, which GeneralUser to update.
     */
    where: GeneralUserWhereUniqueInput
  }


  /**
   * GeneralUser updateMany
   */
  export type GeneralUserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GeneralUsers.
     */
    data: XOR<GeneralUserUpdateManyMutationInput, GeneralUserUncheckedUpdateManyInput>
    /**
     * Filter which GeneralUsers to update
     */
    where?: GeneralUserWhereInput
  }


  /**
   * GeneralUser upsert
   */
  export type GeneralUserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * The filter to search for the GeneralUser to update in case it exists.
     */
    where: GeneralUserWhereUniqueInput
    /**
     * In case the GeneralUser found by the `where` argument doesn't exist, create a new GeneralUser with this data.
     */
    create: XOR<GeneralUserCreateInput, GeneralUserUncheckedCreateInput>
    /**
     * In case the GeneralUser was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GeneralUserUpdateInput, GeneralUserUncheckedUpdateInput>
  }


  /**
   * GeneralUser delete
   */
  export type GeneralUserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
    /**
     * Filter which GeneralUser to delete.
     */
    where: GeneralUserWhereUniqueInput
  }


  /**
   * GeneralUser deleteMany
   */
  export type GeneralUserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeneralUsers to delete
     */
    where?: GeneralUserWhereInput
  }


  /**
   * GeneralUser.profile
   */
  export type GeneralUser$profileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    where?: GeneralUserProfileWhereInput
  }


  /**
   * GeneralUser.Message
   */
  export type GeneralUser$MessageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    cursor?: MessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }


  /**
   * GeneralUser.UserChat
   */
  export type GeneralUser$UserChatArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    where?: UserChatWhereInput
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    cursor?: UserChatWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserChatScalarFieldEnum | UserChatScalarFieldEnum[]
  }


  /**
   * GeneralUser without action
   */
  export type GeneralUserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUser
     */
    select?: GeneralUserSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserInclude<ExtArgs> | null
  }



  /**
   * Model GeneralUserProfile
   */

  export type AggregateGeneralUserProfile = {
    _count: GeneralUserProfileCountAggregateOutputType | null
    _avg: GeneralUserProfileAvgAggregateOutputType | null
    _sum: GeneralUserProfileSumAggregateOutputType | null
    _min: GeneralUserProfileMinAggregateOutputType | null
    _max: GeneralUserProfileMaxAggregateOutputType | null
  }

  export type GeneralUserProfileAvgAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type GeneralUserProfileSumAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type GeneralUserProfileMinAggregateOutputType = {
    id: number | null
    firstName: string | null
    lastName: string | null
    userId: number | null
    email: string | null
    phoneNumber: string | null
  }

  export type GeneralUserProfileMaxAggregateOutputType = {
    id: number | null
    firstName: string | null
    lastName: string | null
    userId: number | null
    email: string | null
    phoneNumber: string | null
  }

  export type GeneralUserProfileCountAggregateOutputType = {
    id: number
    firstName: number
    lastName: number
    userId: number
    email: number
    phoneNumber: number
    _all: number
  }


  export type GeneralUserProfileAvgAggregateInputType = {
    id?: true
    userId?: true
  }

  export type GeneralUserProfileSumAggregateInputType = {
    id?: true
    userId?: true
  }

  export type GeneralUserProfileMinAggregateInputType = {
    id?: true
    firstName?: true
    lastName?: true
    userId?: true
    email?: true
    phoneNumber?: true
  }

  export type GeneralUserProfileMaxAggregateInputType = {
    id?: true
    firstName?: true
    lastName?: true
    userId?: true
    email?: true
    phoneNumber?: true
  }

  export type GeneralUserProfileCountAggregateInputType = {
    id?: true
    firstName?: true
    lastName?: true
    userId?: true
    email?: true
    phoneNumber?: true
    _all?: true
  }

  export type GeneralUserProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeneralUserProfile to aggregate.
     */
    where?: GeneralUserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUserProfiles to fetch.
     */
    orderBy?: GeneralUserProfileOrderByWithRelationInput | GeneralUserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: GeneralUserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned GeneralUserProfiles
    **/
    _count?: true | GeneralUserProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GeneralUserProfileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GeneralUserProfileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GeneralUserProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GeneralUserProfileMaxAggregateInputType
  }

  export type GetGeneralUserProfileAggregateType<T extends GeneralUserProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateGeneralUserProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGeneralUserProfile[P]>
      : GetScalarType<T[P], AggregateGeneralUserProfile[P]>
  }




  export type GeneralUserProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: GeneralUserProfileWhereInput
    orderBy?: GeneralUserProfileOrderByWithAggregationInput | GeneralUserProfileOrderByWithAggregationInput[]
    by: GeneralUserProfileScalarFieldEnum[] | GeneralUserProfileScalarFieldEnum
    having?: GeneralUserProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GeneralUserProfileCountAggregateInputType | true
    _avg?: GeneralUserProfileAvgAggregateInputType
    _sum?: GeneralUserProfileSumAggregateInputType
    _min?: GeneralUserProfileMinAggregateInputType
    _max?: GeneralUserProfileMaxAggregateInputType
  }

  export type GeneralUserProfileGroupByOutputType = {
    id: number
    firstName: string
    lastName: string
    userId: number
    email: string
    phoneNumber: string | null
    _count: GeneralUserProfileCountAggregateOutputType | null
    _avg: GeneralUserProfileAvgAggregateOutputType | null
    _sum: GeneralUserProfileSumAggregateOutputType | null
    _min: GeneralUserProfileMinAggregateOutputType | null
    _max: GeneralUserProfileMaxAggregateOutputType | null
  }

  type GetGeneralUserProfileGroupByPayload<T extends GeneralUserProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GeneralUserProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GeneralUserProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GeneralUserProfileGroupByOutputType[P]>
            : GetScalarType<T[P], GeneralUserProfileGroupByOutputType[P]>
        }
      >
    >


  export type GeneralUserProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    firstName?: boolean
    lastName?: boolean
    userId?: boolean
    email?: boolean
    phoneNumber?: boolean
    address?: boolean | GeneralUserProfile$addressArgs<ExtArgs>
    generalUser?: boolean | GeneralUserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["generalUserProfile"]>

  export type GeneralUserProfileSelectScalar = {
    id?: boolean
    firstName?: boolean
    lastName?: boolean
    userId?: boolean
    email?: boolean
    phoneNumber?: boolean
  }

  export type GeneralUserProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    address?: boolean | GeneralUserProfile$addressArgs<ExtArgs>
    generalUser?: boolean | GeneralUserDefaultArgs<ExtArgs>
  }


  export type $GeneralUserProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "GeneralUserProfile"
    objects: {
      address: Prisma.$AddressPayload<ExtArgs> | null
      generalUser: Prisma.$GeneralUserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      firstName: string
      lastName: string
      userId: number
      email: string
      phoneNumber: string | null
    }, ExtArgs["result"]["generalUserProfile"]>
    composites: {}
  }


  type GeneralUserProfileGetPayload<S extends boolean | null | undefined | GeneralUserProfileDefaultArgs> = $Result.GetResult<Prisma.$GeneralUserProfilePayload, S>

  type GeneralUserProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<GeneralUserProfileFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: GeneralUserProfileCountAggregateInputType | true
    }

  export interface GeneralUserProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['GeneralUserProfile'], meta: { name: 'GeneralUserProfile' } }
    /**
     * Find zero or one GeneralUserProfile that matches the filter.
     * @param {GeneralUserProfileFindUniqueArgs} args - Arguments to find a GeneralUserProfile
     * @example
     * // Get one GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends GeneralUserProfileFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileFindUniqueArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one GeneralUserProfile that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {GeneralUserProfileFindUniqueOrThrowArgs} args - Arguments to find a GeneralUserProfile
     * @example
     * // Get one GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends GeneralUserProfileFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first GeneralUserProfile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileFindFirstArgs} args - Arguments to find a GeneralUserProfile
     * @example
     * // Get one GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends GeneralUserProfileFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileFindFirstArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first GeneralUserProfile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileFindFirstOrThrowArgs} args - Arguments to find a GeneralUserProfile
     * @example
     * // Get one GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends GeneralUserProfileFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more GeneralUserProfiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all GeneralUserProfiles
     * const generalUserProfiles = await prisma.generalUserProfile.findMany()
     * 
     * // Get first 10 GeneralUserProfiles
     * const generalUserProfiles = await prisma.generalUserProfile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const generalUserProfileWithIdOnly = await prisma.generalUserProfile.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends GeneralUserProfileFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a GeneralUserProfile.
     * @param {GeneralUserProfileCreateArgs} args - Arguments to create a GeneralUserProfile.
     * @example
     * // Create one GeneralUserProfile
     * const GeneralUserProfile = await prisma.generalUserProfile.create({
     *   data: {
     *     // ... data to create a GeneralUserProfile
     *   }
     * })
     * 
    **/
    create<T extends GeneralUserProfileCreateArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileCreateArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many GeneralUserProfiles.
     *     @param {GeneralUserProfileCreateManyArgs} args - Arguments to create many GeneralUserProfiles.
     *     @example
     *     // Create many GeneralUserProfiles
     *     const generalUserProfile = await prisma.generalUserProfile.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends GeneralUserProfileCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a GeneralUserProfile.
     * @param {GeneralUserProfileDeleteArgs} args - Arguments to delete one GeneralUserProfile.
     * @example
     * // Delete one GeneralUserProfile
     * const GeneralUserProfile = await prisma.generalUserProfile.delete({
     *   where: {
     *     // ... filter to delete one GeneralUserProfile
     *   }
     * })
     * 
    **/
    delete<T extends GeneralUserProfileDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileDeleteArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one GeneralUserProfile.
     * @param {GeneralUserProfileUpdateArgs} args - Arguments to update one GeneralUserProfile.
     * @example
     * // Update one GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends GeneralUserProfileUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileUpdateArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more GeneralUserProfiles.
     * @param {GeneralUserProfileDeleteManyArgs} args - Arguments to filter GeneralUserProfiles to delete.
     * @example
     * // Delete a few GeneralUserProfiles
     * const { count } = await prisma.generalUserProfile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends GeneralUserProfileDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, GeneralUserProfileDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more GeneralUserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many GeneralUserProfiles
     * const generalUserProfile = await prisma.generalUserProfile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends GeneralUserProfileUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one GeneralUserProfile.
     * @param {GeneralUserProfileUpsertArgs} args - Arguments to update or create a GeneralUserProfile.
     * @example
     * // Update or create a GeneralUserProfile
     * const generalUserProfile = await prisma.generalUserProfile.upsert({
     *   create: {
     *     // ... data to create a GeneralUserProfile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the GeneralUserProfile we want to update
     *   }
     * })
    **/
    upsert<T extends GeneralUserProfileUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, GeneralUserProfileUpsertArgs<ExtArgs>>
    ): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of GeneralUserProfiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileCountArgs} args - Arguments to filter GeneralUserProfiles to count.
     * @example
     * // Count the number of GeneralUserProfiles
     * const count = await prisma.generalUserProfile.count({
     *   where: {
     *     // ... the filter for the GeneralUserProfiles we want to count
     *   }
     * })
    **/
    count<T extends GeneralUserProfileCountArgs>(
      args?: Subset<T, GeneralUserProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GeneralUserProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a GeneralUserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GeneralUserProfileAggregateArgs>(args: Subset<T, GeneralUserProfileAggregateArgs>): Prisma.PrismaPromise<GetGeneralUserProfileAggregateType<T>>

    /**
     * Group by GeneralUserProfile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GeneralUserProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends GeneralUserProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: GeneralUserProfileGroupByArgs['orderBy'] }
        : { orderBy?: GeneralUserProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, GeneralUserProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGeneralUserProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the GeneralUserProfile model
   */
  readonly fields: GeneralUserProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for GeneralUserProfile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__GeneralUserProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    address<T extends GeneralUserProfile$addressArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUserProfile$addressArgs<ExtArgs>>): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    generalUser<T extends GeneralUserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUserDefaultArgs<ExtArgs>>): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the GeneralUserProfile model
   */ 
  interface GeneralUserProfileFieldRefs {
    readonly id: FieldRef<"GeneralUserProfile", 'Int'>
    readonly firstName: FieldRef<"GeneralUserProfile", 'String'>
    readonly lastName: FieldRef<"GeneralUserProfile", 'String'>
    readonly userId: FieldRef<"GeneralUserProfile", 'Int'>
    readonly email: FieldRef<"GeneralUserProfile", 'String'>
    readonly phoneNumber: FieldRef<"GeneralUserProfile", 'String'>
  }
    

  // Custom InputTypes

  /**
   * GeneralUserProfile findUnique
   */
  export type GeneralUserProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUserProfile to fetch.
     */
    where: GeneralUserProfileWhereUniqueInput
  }


  /**
   * GeneralUserProfile findUniqueOrThrow
   */
  export type GeneralUserProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUserProfile to fetch.
     */
    where: GeneralUserProfileWhereUniqueInput
  }


  /**
   * GeneralUserProfile findFirst
   */
  export type GeneralUserProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUserProfile to fetch.
     */
    where?: GeneralUserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUserProfiles to fetch.
     */
    orderBy?: GeneralUserProfileOrderByWithRelationInput | GeneralUserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeneralUserProfiles.
     */
    cursor?: GeneralUserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeneralUserProfiles.
     */
    distinct?: GeneralUserProfileScalarFieldEnum | GeneralUserProfileScalarFieldEnum[]
  }


  /**
   * GeneralUserProfile findFirstOrThrow
   */
  export type GeneralUserProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUserProfile to fetch.
     */
    where?: GeneralUserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUserProfiles to fetch.
     */
    orderBy?: GeneralUserProfileOrderByWithRelationInput | GeneralUserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for GeneralUserProfiles.
     */
    cursor?: GeneralUserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUserProfiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of GeneralUserProfiles.
     */
    distinct?: GeneralUserProfileScalarFieldEnum | GeneralUserProfileScalarFieldEnum[]
  }


  /**
   * GeneralUserProfile findMany
   */
  export type GeneralUserProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter, which GeneralUserProfiles to fetch.
     */
    where?: GeneralUserProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of GeneralUserProfiles to fetch.
     */
    orderBy?: GeneralUserProfileOrderByWithRelationInput | GeneralUserProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing GeneralUserProfiles.
     */
    cursor?: GeneralUserProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` GeneralUserProfiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` GeneralUserProfiles.
     */
    skip?: number
    distinct?: GeneralUserProfileScalarFieldEnum | GeneralUserProfileScalarFieldEnum[]
  }


  /**
   * GeneralUserProfile create
   */
  export type GeneralUserProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a GeneralUserProfile.
     */
    data: XOR<GeneralUserProfileCreateInput, GeneralUserProfileUncheckedCreateInput>
  }


  /**
   * GeneralUserProfile createMany
   */
  export type GeneralUserProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many GeneralUserProfiles.
     */
    data: GeneralUserProfileCreateManyInput | GeneralUserProfileCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * GeneralUserProfile update
   */
  export type GeneralUserProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a GeneralUserProfile.
     */
    data: XOR<GeneralUserProfileUpdateInput, GeneralUserProfileUncheckedUpdateInput>
    /**
     * Choose, which GeneralUserProfile to update.
     */
    where: GeneralUserProfileWhereUniqueInput
  }


  /**
   * GeneralUserProfile updateMany
   */
  export type GeneralUserProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update GeneralUserProfiles.
     */
    data: XOR<GeneralUserProfileUpdateManyMutationInput, GeneralUserProfileUncheckedUpdateManyInput>
    /**
     * Filter which GeneralUserProfiles to update
     */
    where?: GeneralUserProfileWhereInput
  }


  /**
   * GeneralUserProfile upsert
   */
  export type GeneralUserProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the GeneralUserProfile to update in case it exists.
     */
    where: GeneralUserProfileWhereUniqueInput
    /**
     * In case the GeneralUserProfile found by the `where` argument doesn't exist, create a new GeneralUserProfile with this data.
     */
    create: XOR<GeneralUserProfileCreateInput, GeneralUserProfileUncheckedCreateInput>
    /**
     * In case the GeneralUserProfile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<GeneralUserProfileUpdateInput, GeneralUserProfileUncheckedUpdateInput>
  }


  /**
   * GeneralUserProfile delete
   */
  export type GeneralUserProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    /**
     * Filter which GeneralUserProfile to delete.
     */
    where: GeneralUserProfileWhereUniqueInput
  }


  /**
   * GeneralUserProfile deleteMany
   */
  export type GeneralUserProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which GeneralUserProfiles to delete
     */
    where?: GeneralUserProfileWhereInput
  }


  /**
   * GeneralUserProfile.address
   */
  export type GeneralUserProfile$addressArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    where?: AddressWhereInput
  }


  /**
   * GeneralUserProfile without action
   */
  export type GeneralUserProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
  }



  /**
   * Model Address
   */

  export type AggregateAddress = {
    _count: AddressCountAggregateOutputType | null
    _avg: AddressAvgAggregateOutputType | null
    _sum: AddressSumAggregateOutputType | null
    _min: AddressMinAggregateOutputType | null
    _max: AddressMaxAggregateOutputType | null
  }

  export type AddressAvgAggregateOutputType = {
    id: number | null
    profileId: number | null
  }

  export type AddressSumAggregateOutputType = {
    id: number | null
    profileId: number | null
  }

  export type AddressMinAggregateOutputType = {
    id: number | null
    street: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    profileId: number | null
  }

  export type AddressMaxAggregateOutputType = {
    id: number | null
    street: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
    profileId: number | null
  }

  export type AddressCountAggregateOutputType = {
    id: number
    street: number
    city: number
    state: number
    postalCode: number
    country: number
    profileId: number
    _all: number
  }


  export type AddressAvgAggregateInputType = {
    id?: true
    profileId?: true
  }

  export type AddressSumAggregateInputType = {
    id?: true
    profileId?: true
  }

  export type AddressMinAggregateInputType = {
    id?: true
    street?: true
    city?: true
    state?: true
    postalCode?: true
    country?: true
    profileId?: true
  }

  export type AddressMaxAggregateInputType = {
    id?: true
    street?: true
    city?: true
    state?: true
    postalCode?: true
    country?: true
    profileId?: true
  }

  export type AddressCountAggregateInputType = {
    id?: true
    street?: true
    city?: true
    state?: true
    postalCode?: true
    country?: true
    profileId?: true
    _all?: true
  }

  export type AddressAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Address to aggregate.
     */
    where?: AddressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Addresses to fetch.
     */
    orderBy?: AddressOrderByWithRelationInput | AddressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AddressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Addresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Addresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Addresses
    **/
    _count?: true | AddressCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AddressAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AddressSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AddressMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AddressMaxAggregateInputType
  }

  export type GetAddressAggregateType<T extends AddressAggregateArgs> = {
        [P in keyof T & keyof AggregateAddress]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAddress[P]>
      : GetScalarType<T[P], AggregateAddress[P]>
  }




  export type AddressGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AddressWhereInput
    orderBy?: AddressOrderByWithAggregationInput | AddressOrderByWithAggregationInput[]
    by: AddressScalarFieldEnum[] | AddressScalarFieldEnum
    having?: AddressScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AddressCountAggregateInputType | true
    _avg?: AddressAvgAggregateInputType
    _sum?: AddressSumAggregateInputType
    _min?: AddressMinAggregateInputType
    _max?: AddressMaxAggregateInputType
  }

  export type AddressGroupByOutputType = {
    id: number
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    profileId: number | null
    _count: AddressCountAggregateOutputType | null
    _avg: AddressAvgAggregateOutputType | null
    _sum: AddressSumAggregateOutputType | null
    _min: AddressMinAggregateOutputType | null
    _max: AddressMaxAggregateOutputType | null
  }

  type GetAddressGroupByPayload<T extends AddressGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AddressGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AddressGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AddressGroupByOutputType[P]>
            : GetScalarType<T[P], AddressGroupByOutputType[P]>
        }
      >
    >


  export type AddressSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    street?: boolean
    city?: boolean
    state?: boolean
    postalCode?: boolean
    country?: boolean
    profileId?: boolean
    generalUserProfile?: boolean | Address$generalUserProfileArgs<ExtArgs>
  }, ExtArgs["result"]["address"]>

  export type AddressSelectScalar = {
    id?: boolean
    street?: boolean
    city?: boolean
    state?: boolean
    postalCode?: boolean
    country?: boolean
    profileId?: boolean
  }

  export type AddressInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    generalUserProfile?: boolean | Address$generalUserProfileArgs<ExtArgs>
  }


  export type $AddressPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Address"
    objects: {
      generalUserProfile: Prisma.$GeneralUserProfilePayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      street: string
      city: string
      state: string
      postalCode: string
      country: string
      profileId: number | null
    }, ExtArgs["result"]["address"]>
    composites: {}
  }


  type AddressGetPayload<S extends boolean | null | undefined | AddressDefaultArgs> = $Result.GetResult<Prisma.$AddressPayload, S>

  type AddressCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<AddressFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: AddressCountAggregateInputType | true
    }

  export interface AddressDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Address'], meta: { name: 'Address' } }
    /**
     * Find zero or one Address that matches the filter.
     * @param {AddressFindUniqueArgs} args - Arguments to find a Address
     * @example
     * // Get one Address
     * const address = await prisma.address.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends AddressFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, AddressFindUniqueArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Address that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {AddressFindUniqueOrThrowArgs} args - Arguments to find a Address
     * @example
     * // Get one Address
     * const address = await prisma.address.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends AddressFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Address that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressFindFirstArgs} args - Arguments to find a Address
     * @example
     * // Get one Address
     * const address = await prisma.address.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends AddressFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressFindFirstArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Address that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressFindFirstOrThrowArgs} args - Arguments to find a Address
     * @example
     * // Get one Address
     * const address = await prisma.address.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends AddressFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Addresses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Addresses
     * const addresses = await prisma.address.findMany()
     * 
     * // Get first 10 Addresses
     * const addresses = await prisma.address.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const addressWithIdOnly = await prisma.address.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends AddressFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Address.
     * @param {AddressCreateArgs} args - Arguments to create a Address.
     * @example
     * // Create one Address
     * const Address = await prisma.address.create({
     *   data: {
     *     // ... data to create a Address
     *   }
     * })
     * 
    **/
    create<T extends AddressCreateArgs<ExtArgs>>(
      args: SelectSubset<T, AddressCreateArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Addresses.
     *     @param {AddressCreateManyArgs} args - Arguments to create many Addresses.
     *     @example
     *     // Create many Addresses
     *     const address = await prisma.address.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends AddressCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Address.
     * @param {AddressDeleteArgs} args - Arguments to delete one Address.
     * @example
     * // Delete one Address
     * const Address = await prisma.address.delete({
     *   where: {
     *     // ... filter to delete one Address
     *   }
     * })
     * 
    **/
    delete<T extends AddressDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, AddressDeleteArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Address.
     * @param {AddressUpdateArgs} args - Arguments to update one Address.
     * @example
     * // Update one Address
     * const address = await prisma.address.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends AddressUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, AddressUpdateArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Addresses.
     * @param {AddressDeleteManyArgs} args - Arguments to filter Addresses to delete.
     * @example
     * // Delete a few Addresses
     * const { count } = await prisma.address.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends AddressDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, AddressDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Addresses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Addresses
     * const address = await prisma.address.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends AddressUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, AddressUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Address.
     * @param {AddressUpsertArgs} args - Arguments to update or create a Address.
     * @example
     * // Update or create a Address
     * const address = await prisma.address.upsert({
     *   create: {
     *     // ... data to create a Address
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Address we want to update
     *   }
     * })
    **/
    upsert<T extends AddressUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, AddressUpsertArgs<ExtArgs>>
    ): Prisma__AddressClient<$Result.GetResult<Prisma.$AddressPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Addresses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressCountArgs} args - Arguments to filter Addresses to count.
     * @example
     * // Count the number of Addresses
     * const count = await prisma.address.count({
     *   where: {
     *     // ... the filter for the Addresses we want to count
     *   }
     * })
    **/
    count<T extends AddressCountArgs>(
      args?: Subset<T, AddressCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AddressCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Address.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AddressAggregateArgs>(args: Subset<T, AddressAggregateArgs>): Prisma.PrismaPromise<GetAddressAggregateType<T>>

    /**
     * Group by Address.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AddressGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AddressGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AddressGroupByArgs['orderBy'] }
        : { orderBy?: AddressGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AddressGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAddressGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Address model
   */
  readonly fields: AddressFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Address.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AddressClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    generalUserProfile<T extends Address$generalUserProfileArgs<ExtArgs> = {}>(args?: Subset<T, Address$generalUserProfileArgs<ExtArgs>>): Prisma__GeneralUserProfileClient<$Result.GetResult<Prisma.$GeneralUserProfilePayload<ExtArgs>, T, 'findUniqueOrThrow'> | null, null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Address model
   */ 
  interface AddressFieldRefs {
    readonly id: FieldRef<"Address", 'Int'>
    readonly street: FieldRef<"Address", 'String'>
    readonly city: FieldRef<"Address", 'String'>
    readonly state: FieldRef<"Address", 'String'>
    readonly postalCode: FieldRef<"Address", 'String'>
    readonly country: FieldRef<"Address", 'String'>
    readonly profileId: FieldRef<"Address", 'Int'>
  }
    

  // Custom InputTypes

  /**
   * Address findUnique
   */
  export type AddressFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter, which Address to fetch.
     */
    where: AddressWhereUniqueInput
  }


  /**
   * Address findUniqueOrThrow
   */
  export type AddressFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter, which Address to fetch.
     */
    where: AddressWhereUniqueInput
  }


  /**
   * Address findFirst
   */
  export type AddressFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter, which Address to fetch.
     */
    where?: AddressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Addresses to fetch.
     */
    orderBy?: AddressOrderByWithRelationInput | AddressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Addresses.
     */
    cursor?: AddressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Addresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Addresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Addresses.
     */
    distinct?: AddressScalarFieldEnum | AddressScalarFieldEnum[]
  }


  /**
   * Address findFirstOrThrow
   */
  export type AddressFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter, which Address to fetch.
     */
    where?: AddressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Addresses to fetch.
     */
    orderBy?: AddressOrderByWithRelationInput | AddressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Addresses.
     */
    cursor?: AddressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Addresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Addresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Addresses.
     */
    distinct?: AddressScalarFieldEnum | AddressScalarFieldEnum[]
  }


  /**
   * Address findMany
   */
  export type AddressFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter, which Addresses to fetch.
     */
    where?: AddressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Addresses to fetch.
     */
    orderBy?: AddressOrderByWithRelationInput | AddressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Addresses.
     */
    cursor?: AddressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Addresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Addresses.
     */
    skip?: number
    distinct?: AddressScalarFieldEnum | AddressScalarFieldEnum[]
  }


  /**
   * Address create
   */
  export type AddressCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * The data needed to create a Address.
     */
    data: XOR<AddressCreateInput, AddressUncheckedCreateInput>
  }


  /**
   * Address createMany
   */
  export type AddressCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Addresses.
     */
    data: AddressCreateManyInput | AddressCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Address update
   */
  export type AddressUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * The data needed to update a Address.
     */
    data: XOR<AddressUpdateInput, AddressUncheckedUpdateInput>
    /**
     * Choose, which Address to update.
     */
    where: AddressWhereUniqueInput
  }


  /**
   * Address updateMany
   */
  export type AddressUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Addresses.
     */
    data: XOR<AddressUpdateManyMutationInput, AddressUncheckedUpdateManyInput>
    /**
     * Filter which Addresses to update
     */
    where?: AddressWhereInput
  }


  /**
   * Address upsert
   */
  export type AddressUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * The filter to search for the Address to update in case it exists.
     */
    where: AddressWhereUniqueInput
    /**
     * In case the Address found by the `where` argument doesn't exist, create a new Address with this data.
     */
    create: XOR<AddressCreateInput, AddressUncheckedCreateInput>
    /**
     * In case the Address was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AddressUpdateInput, AddressUncheckedUpdateInput>
  }


  /**
   * Address delete
   */
  export type AddressDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
    /**
     * Filter which Address to delete.
     */
    where: AddressWhereUniqueInput
  }


  /**
   * Address deleteMany
   */
  export type AddressDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Addresses to delete
     */
    where?: AddressWhereInput
  }


  /**
   * Address.generalUserProfile
   */
  export type Address$generalUserProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the GeneralUserProfile
     */
    select?: GeneralUserProfileSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: GeneralUserProfileInclude<ExtArgs> | null
    where?: GeneralUserProfileWhereInput
  }


  /**
   * Address without action
   */
  export type AddressDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Address
     */
    select?: AddressSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: AddressInclude<ExtArgs> | null
  }



  /**
   * Model Message
   */

  export type AggregateMessage = {
    _count: MessageCountAggregateOutputType | null
    _avg: MessageAvgAggregateOutputType | null
    _sum: MessageSumAggregateOutputType | null
    _min: MessageMinAggregateOutputType | null
    _max: MessageMaxAggregateOutputType | null
  }

  export type MessageAvgAggregateOutputType = {
    id: number | null
    chatRoomId: number | null
    senderId: number | null
  }

  export type MessageSumAggregateOutputType = {
    id: number | null
    chatRoomId: number | null
    senderId: number | null
  }

  export type MessageMinAggregateOutputType = {
    id: number | null
    chatRoomId: number | null
    senderId: number | null
    content: string | null
    createdAt: Date | null
  }

  export type MessageMaxAggregateOutputType = {
    id: number | null
    chatRoomId: number | null
    senderId: number | null
    content: string | null
    createdAt: Date | null
  }

  export type MessageCountAggregateOutputType = {
    id: number
    chatRoomId: number
    senderId: number
    content: number
    createdAt: number
    _all: number
  }


  export type MessageAvgAggregateInputType = {
    id?: true
    chatRoomId?: true
    senderId?: true
  }

  export type MessageSumAggregateInputType = {
    id?: true
    chatRoomId?: true
    senderId?: true
  }

  export type MessageMinAggregateInputType = {
    id?: true
    chatRoomId?: true
    senderId?: true
    content?: true
    createdAt?: true
  }

  export type MessageMaxAggregateInputType = {
    id?: true
    chatRoomId?: true
    senderId?: true
    content?: true
    createdAt?: true
  }

  export type MessageCountAggregateInputType = {
    id?: true
    chatRoomId?: true
    senderId?: true
    content?: true
    createdAt?: true
    _all?: true
  }

  export type MessageAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Message to aggregate.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Messages
    **/
    _count?: true | MessageCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MessageAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MessageSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessageMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessageMaxAggregateInputType
  }

  export type GetMessageAggregateType<T extends MessageAggregateArgs> = {
        [P in keyof T & keyof AggregateMessage]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessage[P]>
      : GetScalarType<T[P], AggregateMessage[P]>
  }




  export type MessageGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithAggregationInput | MessageOrderByWithAggregationInput[]
    by: MessageScalarFieldEnum[] | MessageScalarFieldEnum
    having?: MessageScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessageCountAggregateInputType | true
    _avg?: MessageAvgAggregateInputType
    _sum?: MessageSumAggregateInputType
    _min?: MessageMinAggregateInputType
    _max?: MessageMaxAggregateInputType
  }

  export type MessageGroupByOutputType = {
    id: number
    chatRoomId: number
    senderId: number
    content: string
    createdAt: Date
    _count: MessageCountAggregateOutputType | null
    _avg: MessageAvgAggregateOutputType | null
    _sum: MessageSumAggregateOutputType | null
    _min: MessageMinAggregateOutputType | null
    _max: MessageMaxAggregateOutputType | null
  }

  type GetMessageGroupByPayload<T extends MessageGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessageGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessageGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessageGroupByOutputType[P]>
            : GetScalarType<T[P], MessageGroupByOutputType[P]>
        }
      >
    >


  export type MessageSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    chatRoomId?: boolean
    senderId?: boolean
    content?: boolean
    createdAt?: boolean
    chat?: boolean | ChatRoomDefaultArgs<ExtArgs>
    sender?: boolean | GeneralUserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["message"]>

  export type MessageSelectScalar = {
    id?: boolean
    chatRoomId?: boolean
    senderId?: boolean
    content?: boolean
    createdAt?: boolean
  }

  export type MessageInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chat?: boolean | ChatRoomDefaultArgs<ExtArgs>
    sender?: boolean | GeneralUserDefaultArgs<ExtArgs>
  }


  export type $MessagePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Message"
    objects: {
      chat: Prisma.$ChatRoomPayload<ExtArgs>
      sender: Prisma.$GeneralUserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      chatRoomId: number
      senderId: number
      content: string
      createdAt: Date
    }, ExtArgs["result"]["message"]>
    composites: {}
  }


  type MessageGetPayload<S extends boolean | null | undefined | MessageDefaultArgs> = $Result.GetResult<Prisma.$MessagePayload, S>

  type MessageCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<MessageFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: MessageCountAggregateInputType | true
    }

  export interface MessageDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Message'], meta: { name: 'Message' } }
    /**
     * Find zero or one Message that matches the filter.
     * @param {MessageFindUniqueArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends MessageFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, MessageFindUniqueArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Message that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {MessageFindUniqueOrThrowArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends MessageFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Message that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindFirstArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends MessageFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageFindFirstArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Message that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindFirstOrThrowArgs} args - Arguments to find a Message
     * @example
     * // Get one Message
     * const message = await prisma.message.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends MessageFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Messages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Messages
     * const messages = await prisma.message.findMany()
     * 
     * // Get first 10 Messages
     * const messages = await prisma.message.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messageWithIdOnly = await prisma.message.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends MessageFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Message.
     * @param {MessageCreateArgs} args - Arguments to create a Message.
     * @example
     * // Create one Message
     * const Message = await prisma.message.create({
     *   data: {
     *     // ... data to create a Message
     *   }
     * })
     * 
    **/
    create<T extends MessageCreateArgs<ExtArgs>>(
      args: SelectSubset<T, MessageCreateArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Messages.
     *     @param {MessageCreateManyArgs} args - Arguments to create many Messages.
     *     @example
     *     // Create many Messages
     *     const message = await prisma.message.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends MessageCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Message.
     * @param {MessageDeleteArgs} args - Arguments to delete one Message.
     * @example
     * // Delete one Message
     * const Message = await prisma.message.delete({
     *   where: {
     *     // ... filter to delete one Message
     *   }
     * })
     * 
    **/
    delete<T extends MessageDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, MessageDeleteArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Message.
     * @param {MessageUpdateArgs} args - Arguments to update one Message.
     * @example
     * // Update one Message
     * const message = await prisma.message.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends MessageUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, MessageUpdateArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Messages.
     * @param {MessageDeleteManyArgs} args - Arguments to filter Messages to delete.
     * @example
     * // Delete a few Messages
     * const { count } = await prisma.message.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends MessageDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, MessageDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Messages
     * const message = await prisma.message.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends MessageUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, MessageUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Message.
     * @param {MessageUpsertArgs} args - Arguments to update or create a Message.
     * @example
     * // Update or create a Message
     * const message = await prisma.message.upsert({
     *   create: {
     *     // ... data to create a Message
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Message we want to update
     *   }
     * })
    **/
    upsert<T extends MessageUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, MessageUpsertArgs<ExtArgs>>
    ): Prisma__MessageClient<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageCountArgs} args - Arguments to filter Messages to count.
     * @example
     * // Count the number of Messages
     * const count = await prisma.message.count({
     *   where: {
     *     // ... the filter for the Messages we want to count
     *   }
     * })
    **/
    count<T extends MessageCountArgs>(
      args?: Subset<T, MessageCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessageCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Message.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MessageAggregateArgs>(args: Subset<T, MessageAggregateArgs>): Prisma.PrismaPromise<GetMessageAggregateType<T>>

    /**
     * Group by Message.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessageGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends MessageGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: MessageGroupByArgs['orderBy'] }
        : { orderBy?: MessageGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, MessageGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessageGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Message model
   */
  readonly fields: MessageFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Message.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__MessageClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    chat<T extends ChatRoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ChatRoomDefaultArgs<ExtArgs>>): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    sender<T extends GeneralUserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUserDefaultArgs<ExtArgs>>): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Message model
   */ 
  interface MessageFieldRefs {
    readonly id: FieldRef<"Message", 'Int'>
    readonly chatRoomId: FieldRef<"Message", 'Int'>
    readonly senderId: FieldRef<"Message", 'Int'>
    readonly content: FieldRef<"Message", 'String'>
    readonly createdAt: FieldRef<"Message", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * Message findUnique
   */
  export type MessageFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where: MessageWhereUniqueInput
  }


  /**
   * Message findUniqueOrThrow
   */
  export type MessageFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where: MessageWhereUniqueInput
  }


  /**
   * Message findFirst
   */
  export type MessageFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Messages.
     */
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }


  /**
   * Message findFirstOrThrow
   */
  export type MessageFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Message to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Messages.
     */
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }


  /**
   * Message findMany
   */
  export type MessageFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter, which Messages to fetch.
     */
    where?: MessageWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Messages to fetch.
     */
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Messages.
     */
    cursor?: MessageWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Messages.
     */
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }


  /**
   * Message create
   */
  export type MessageCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The data needed to create a Message.
     */
    data: XOR<MessageCreateInput, MessageUncheckedCreateInput>
  }


  /**
   * Message createMany
   */
  export type MessageCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Messages.
     */
    data: MessageCreateManyInput | MessageCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Message update
   */
  export type MessageUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The data needed to update a Message.
     */
    data: XOR<MessageUpdateInput, MessageUncheckedUpdateInput>
    /**
     * Choose, which Message to update.
     */
    where: MessageWhereUniqueInput
  }


  /**
   * Message updateMany
   */
  export type MessageUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Messages.
     */
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyInput>
    /**
     * Filter which Messages to update
     */
    where?: MessageWhereInput
  }


  /**
   * Message upsert
   */
  export type MessageUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * The filter to search for the Message to update in case it exists.
     */
    where: MessageWhereUniqueInput
    /**
     * In case the Message found by the `where` argument doesn't exist, create a new Message with this data.
     */
    create: XOR<MessageCreateInput, MessageUncheckedCreateInput>
    /**
     * In case the Message was found with the provided `where` argument, update it with this data.
     */
    update: XOR<MessageUpdateInput, MessageUncheckedUpdateInput>
  }


  /**
   * Message delete
   */
  export type MessageDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    /**
     * Filter which Message to delete.
     */
    where: MessageWhereUniqueInput
  }


  /**
   * Message deleteMany
   */
  export type MessageDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Messages to delete
     */
    where?: MessageWhereInput
  }


  /**
   * Message without action
   */
  export type MessageDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
  }



  /**
   * Model ChatRoom
   */

  export type AggregateChatRoom = {
    _count: ChatRoomCountAggregateOutputType | null
    _avg: ChatRoomAvgAggregateOutputType | null
    _sum: ChatRoomSumAggregateOutputType | null
    _min: ChatRoomMinAggregateOutputType | null
    _max: ChatRoomMaxAggregateOutputType | null
  }

  export type ChatRoomAvgAggregateOutputType = {
    id: number | null
  }

  export type ChatRoomSumAggregateOutputType = {
    id: number | null
  }

  export type ChatRoomMinAggregateOutputType = {
    id: number | null
    type: $Enums.ChatType | null
    createdAt: Date | null
  }

  export type ChatRoomMaxAggregateOutputType = {
    id: number | null
    type: $Enums.ChatType | null
    createdAt: Date | null
  }

  export type ChatRoomCountAggregateOutputType = {
    id: number
    type: number
    createdAt: number
    _all: number
  }


  export type ChatRoomAvgAggregateInputType = {
    id?: true
  }

  export type ChatRoomSumAggregateInputType = {
    id?: true
  }

  export type ChatRoomMinAggregateInputType = {
    id?: true
    type?: true
    createdAt?: true
  }

  export type ChatRoomMaxAggregateInputType = {
    id?: true
    type?: true
    createdAt?: true
  }

  export type ChatRoomCountAggregateInputType = {
    id?: true
    type?: true
    createdAt?: true
    _all?: true
  }

  export type ChatRoomAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatRoom to aggregate.
     */
    where?: ChatRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatRooms to fetch.
     */
    orderBy?: ChatRoomOrderByWithRelationInput | ChatRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ChatRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ChatRooms
    **/
    _count?: true | ChatRoomCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ChatRoomAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ChatRoomSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ChatRoomMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ChatRoomMaxAggregateInputType
  }

  export type GetChatRoomAggregateType<T extends ChatRoomAggregateArgs> = {
        [P in keyof T & keyof AggregateChatRoom]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateChatRoom[P]>
      : GetScalarType<T[P], AggregateChatRoom[P]>
  }




  export type ChatRoomGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChatRoomWhereInput
    orderBy?: ChatRoomOrderByWithAggregationInput | ChatRoomOrderByWithAggregationInput[]
    by: ChatRoomScalarFieldEnum[] | ChatRoomScalarFieldEnum
    having?: ChatRoomScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ChatRoomCountAggregateInputType | true
    _avg?: ChatRoomAvgAggregateInputType
    _sum?: ChatRoomSumAggregateInputType
    _min?: ChatRoomMinAggregateInputType
    _max?: ChatRoomMaxAggregateInputType
  }

  export type ChatRoomGroupByOutputType = {
    id: number
    type: $Enums.ChatType
    createdAt: Date
    _count: ChatRoomCountAggregateOutputType | null
    _avg: ChatRoomAvgAggregateOutputType | null
    _sum: ChatRoomSumAggregateOutputType | null
    _min: ChatRoomMinAggregateOutputType | null
    _max: ChatRoomMaxAggregateOutputType | null
  }

  type GetChatRoomGroupByPayload<T extends ChatRoomGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ChatRoomGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ChatRoomGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ChatRoomGroupByOutputType[P]>
            : GetScalarType<T[P], ChatRoomGroupByOutputType[P]>
        }
      >
    >


  export type ChatRoomSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    createdAt?: boolean
    messages?: boolean | ChatRoom$messagesArgs<ExtArgs>
    userChats?: boolean | ChatRoom$userChatsArgs<ExtArgs>
    _count?: boolean | ChatRoomCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chatRoom"]>

  export type ChatRoomSelectScalar = {
    id?: boolean
    type?: boolean
    createdAt?: boolean
  }

  export type ChatRoomInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    messages?: boolean | ChatRoom$messagesArgs<ExtArgs>
    userChats?: boolean | ChatRoom$userChatsArgs<ExtArgs>
    _count?: boolean | ChatRoomCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $ChatRoomPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ChatRoom"
    objects: {
      messages: Prisma.$MessagePayload<ExtArgs>[]
      userChats: Prisma.$UserChatPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      type: $Enums.ChatType
      createdAt: Date
    }, ExtArgs["result"]["chatRoom"]>
    composites: {}
  }


  type ChatRoomGetPayload<S extends boolean | null | undefined | ChatRoomDefaultArgs> = $Result.GetResult<Prisma.$ChatRoomPayload, S>

  type ChatRoomCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ChatRoomFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ChatRoomCountAggregateInputType | true
    }

  export interface ChatRoomDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ChatRoom'], meta: { name: 'ChatRoom' } }
    /**
     * Find zero or one ChatRoom that matches the filter.
     * @param {ChatRoomFindUniqueArgs} args - Arguments to find a ChatRoom
     * @example
     * // Get one ChatRoom
     * const chatRoom = await prisma.chatRoom.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends ChatRoomFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomFindUniqueArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one ChatRoom that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {ChatRoomFindUniqueOrThrowArgs} args - Arguments to find a ChatRoom
     * @example
     * // Get one ChatRoom
     * const chatRoom = await prisma.chatRoom.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends ChatRoomFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first ChatRoom that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomFindFirstArgs} args - Arguments to find a ChatRoom
     * @example
     * // Get one ChatRoom
     * const chatRoom = await prisma.chatRoom.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends ChatRoomFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomFindFirstArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first ChatRoom that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomFindFirstOrThrowArgs} args - Arguments to find a ChatRoom
     * @example
     * // Get one ChatRoom
     * const chatRoom = await prisma.chatRoom.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends ChatRoomFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more ChatRooms that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ChatRooms
     * const chatRooms = await prisma.chatRoom.findMany()
     * 
     * // Get first 10 ChatRooms
     * const chatRooms = await prisma.chatRoom.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const chatRoomWithIdOnly = await prisma.chatRoom.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends ChatRoomFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a ChatRoom.
     * @param {ChatRoomCreateArgs} args - Arguments to create a ChatRoom.
     * @example
     * // Create one ChatRoom
     * const ChatRoom = await prisma.chatRoom.create({
     *   data: {
     *     // ... data to create a ChatRoom
     *   }
     * })
     * 
    **/
    create<T extends ChatRoomCreateArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomCreateArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many ChatRooms.
     *     @param {ChatRoomCreateManyArgs} args - Arguments to create many ChatRooms.
     *     @example
     *     // Create many ChatRooms
     *     const chatRoom = await prisma.chatRoom.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends ChatRoomCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ChatRoom.
     * @param {ChatRoomDeleteArgs} args - Arguments to delete one ChatRoom.
     * @example
     * // Delete one ChatRoom
     * const ChatRoom = await prisma.chatRoom.delete({
     *   where: {
     *     // ... filter to delete one ChatRoom
     *   }
     * })
     * 
    **/
    delete<T extends ChatRoomDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomDeleteArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one ChatRoom.
     * @param {ChatRoomUpdateArgs} args - Arguments to update one ChatRoom.
     * @example
     * // Update one ChatRoom
     * const chatRoom = await prisma.chatRoom.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends ChatRoomUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomUpdateArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more ChatRooms.
     * @param {ChatRoomDeleteManyArgs} args - Arguments to filter ChatRooms to delete.
     * @example
     * // Delete a few ChatRooms
     * const { count } = await prisma.chatRoom.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends ChatRoomDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ChatRoomDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ChatRooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ChatRooms
     * const chatRoom = await prisma.chatRoom.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends ChatRoomUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ChatRoom.
     * @param {ChatRoomUpsertArgs} args - Arguments to update or create a ChatRoom.
     * @example
     * // Update or create a ChatRoom
     * const chatRoom = await prisma.chatRoom.upsert({
     *   create: {
     *     // ... data to create a ChatRoom
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ChatRoom we want to update
     *   }
     * })
    **/
    upsert<T extends ChatRoomUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, ChatRoomUpsertArgs<ExtArgs>>
    ): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of ChatRooms.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomCountArgs} args - Arguments to filter ChatRooms to count.
     * @example
     * // Count the number of ChatRooms
     * const count = await prisma.chatRoom.count({
     *   where: {
     *     // ... the filter for the ChatRooms we want to count
     *   }
     * })
    **/
    count<T extends ChatRoomCountArgs>(
      args?: Subset<T, ChatRoomCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ChatRoomCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ChatRoom.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ChatRoomAggregateArgs>(args: Subset<T, ChatRoomAggregateArgs>): Prisma.PrismaPromise<GetChatRoomAggregateType<T>>

    /**
     * Group by ChatRoom.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChatRoomGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ChatRoomGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ChatRoomGroupByArgs['orderBy'] }
        : { orderBy?: ChatRoomGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ChatRoomGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetChatRoomGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ChatRoom model
   */
  readonly fields: ChatRoomFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ChatRoom.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ChatRoomClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    messages<T extends ChatRoom$messagesArgs<ExtArgs> = {}>(args?: Subset<T, ChatRoom$messagesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$MessagePayload<ExtArgs>, T, 'findMany'> | Null>;

    userChats<T extends ChatRoom$userChatsArgs<ExtArgs> = {}>(args?: Subset<T, ChatRoom$userChatsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the ChatRoom model
   */ 
  interface ChatRoomFieldRefs {
    readonly id: FieldRef<"ChatRoom", 'Int'>
    readonly type: FieldRef<"ChatRoom", 'ChatType'>
    readonly createdAt: FieldRef<"ChatRoom", 'DateTime'>
  }
    

  // Custom InputTypes

  /**
   * ChatRoom findUnique
   */
  export type ChatRoomFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter, which ChatRoom to fetch.
     */
    where: ChatRoomWhereUniqueInput
  }


  /**
   * ChatRoom findUniqueOrThrow
   */
  export type ChatRoomFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter, which ChatRoom to fetch.
     */
    where: ChatRoomWhereUniqueInput
  }


  /**
   * ChatRoom findFirst
   */
  export type ChatRoomFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter, which ChatRoom to fetch.
     */
    where?: ChatRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatRooms to fetch.
     */
    orderBy?: ChatRoomOrderByWithRelationInput | ChatRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatRooms.
     */
    cursor?: ChatRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatRooms.
     */
    distinct?: ChatRoomScalarFieldEnum | ChatRoomScalarFieldEnum[]
  }


  /**
   * ChatRoom findFirstOrThrow
   */
  export type ChatRoomFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter, which ChatRoom to fetch.
     */
    where?: ChatRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatRooms to fetch.
     */
    orderBy?: ChatRoomOrderByWithRelationInput | ChatRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ChatRooms.
     */
    cursor?: ChatRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatRooms.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ChatRooms.
     */
    distinct?: ChatRoomScalarFieldEnum | ChatRoomScalarFieldEnum[]
  }


  /**
   * ChatRoom findMany
   */
  export type ChatRoomFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter, which ChatRooms to fetch.
     */
    where?: ChatRoomWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ChatRooms to fetch.
     */
    orderBy?: ChatRoomOrderByWithRelationInput | ChatRoomOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ChatRooms.
     */
    cursor?: ChatRoomWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ChatRooms from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ChatRooms.
     */
    skip?: number
    distinct?: ChatRoomScalarFieldEnum | ChatRoomScalarFieldEnum[]
  }


  /**
   * ChatRoom create
   */
  export type ChatRoomCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * The data needed to create a ChatRoom.
     */
    data: XOR<ChatRoomCreateInput, ChatRoomUncheckedCreateInput>
  }


  /**
   * ChatRoom createMany
   */
  export type ChatRoomCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ChatRooms.
     */
    data: ChatRoomCreateManyInput | ChatRoomCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * ChatRoom update
   */
  export type ChatRoomUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * The data needed to update a ChatRoom.
     */
    data: XOR<ChatRoomUpdateInput, ChatRoomUncheckedUpdateInput>
    /**
     * Choose, which ChatRoom to update.
     */
    where: ChatRoomWhereUniqueInput
  }


  /**
   * ChatRoom updateMany
   */
  export type ChatRoomUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ChatRooms.
     */
    data: XOR<ChatRoomUpdateManyMutationInput, ChatRoomUncheckedUpdateManyInput>
    /**
     * Filter which ChatRooms to update
     */
    where?: ChatRoomWhereInput
  }


  /**
   * ChatRoom upsert
   */
  export type ChatRoomUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * The filter to search for the ChatRoom to update in case it exists.
     */
    where: ChatRoomWhereUniqueInput
    /**
     * In case the ChatRoom found by the `where` argument doesn't exist, create a new ChatRoom with this data.
     */
    create: XOR<ChatRoomCreateInput, ChatRoomUncheckedCreateInput>
    /**
     * In case the ChatRoom was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ChatRoomUpdateInput, ChatRoomUncheckedUpdateInput>
  }


  /**
   * ChatRoom delete
   */
  export type ChatRoomDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
    /**
     * Filter which ChatRoom to delete.
     */
    where: ChatRoomWhereUniqueInput
  }


  /**
   * ChatRoom deleteMany
   */
  export type ChatRoomDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ChatRooms to delete
     */
    where?: ChatRoomWhereInput
  }


  /**
   * ChatRoom.messages
   */
  export type ChatRoom$messagesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Message
     */
    select?: MessageSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: MessageInclude<ExtArgs> | null
    where?: MessageWhereInput
    orderBy?: MessageOrderByWithRelationInput | MessageOrderByWithRelationInput[]
    cursor?: MessageWhereUniqueInput
    take?: number
    skip?: number
    distinct?: MessageScalarFieldEnum | MessageScalarFieldEnum[]
  }


  /**
   * ChatRoom.userChats
   */
  export type ChatRoom$userChatsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    where?: UserChatWhereInput
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    cursor?: UserChatWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserChatScalarFieldEnum | UserChatScalarFieldEnum[]
  }


  /**
   * ChatRoom without action
   */
  export type ChatRoomDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChatRoom
     */
    select?: ChatRoomSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ChatRoomInclude<ExtArgs> | null
  }



  /**
   * Model UserChat
   */

  export type AggregateUserChat = {
    _count: UserChatCountAggregateOutputType | null
    _avg: UserChatAvgAggregateOutputType | null
    _sum: UserChatSumAggregateOutputType | null
    _min: UserChatMinAggregateOutputType | null
    _max: UserChatMaxAggregateOutputType | null
  }

  export type UserChatAvgAggregateOutputType = {
    id: number | null
    userId: number | null
    chatRoomId: number | null
  }

  export type UserChatSumAggregateOutputType = {
    id: number | null
    userId: number | null
    chatRoomId: number | null
  }

  export type UserChatMinAggregateOutputType = {
    id: number | null
    userId: number | null
    chatRoomId: number | null
  }

  export type UserChatMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    chatRoomId: number | null
  }

  export type UserChatCountAggregateOutputType = {
    id: number
    userId: number
    chatRoomId: number
    _all: number
  }


  export type UserChatAvgAggregateInputType = {
    id?: true
    userId?: true
    chatRoomId?: true
  }

  export type UserChatSumAggregateInputType = {
    id?: true
    userId?: true
    chatRoomId?: true
  }

  export type UserChatMinAggregateInputType = {
    id?: true
    userId?: true
    chatRoomId?: true
  }

  export type UserChatMaxAggregateInputType = {
    id?: true
    userId?: true
    chatRoomId?: true
  }

  export type UserChatCountAggregateInputType = {
    id?: true
    userId?: true
    chatRoomId?: true
    _all?: true
  }

  export type UserChatAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserChat to aggregate.
     */
    where?: UserChatWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserChats to fetch.
     */
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserChatWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserChats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserChats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserChats
    **/
    _count?: true | UserChatCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserChatAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserChatSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserChatMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserChatMaxAggregateInputType
  }

  export type GetUserChatAggregateType<T extends UserChatAggregateArgs> = {
        [P in keyof T & keyof AggregateUserChat]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserChat[P]>
      : GetScalarType<T[P], AggregateUserChat[P]>
  }




  export type UserChatGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserChatWhereInput
    orderBy?: UserChatOrderByWithAggregationInput | UserChatOrderByWithAggregationInput[]
    by: UserChatScalarFieldEnum[] | UserChatScalarFieldEnum
    having?: UserChatScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserChatCountAggregateInputType | true
    _avg?: UserChatAvgAggregateInputType
    _sum?: UserChatSumAggregateInputType
    _min?: UserChatMinAggregateInputType
    _max?: UserChatMaxAggregateInputType
  }

  export type UserChatGroupByOutputType = {
    id: number
    userId: number
    chatRoomId: number
    _count: UserChatCountAggregateOutputType | null
    _avg: UserChatAvgAggregateOutputType | null
    _sum: UserChatSumAggregateOutputType | null
    _min: UserChatMinAggregateOutputType | null
    _max: UserChatMaxAggregateOutputType | null
  }

  type GetUserChatGroupByPayload<T extends UserChatGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserChatGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserChatGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserChatGroupByOutputType[P]>
            : GetScalarType<T[P], UserChatGroupByOutputType[P]>
        }
      >
    >


  export type UserChatSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    chatRoomId?: boolean
    user?: boolean | GeneralUserDefaultArgs<ExtArgs>
    chatRoom?: boolean | ChatRoomDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userChat"]>

  export type UserChatSelectScalar = {
    id?: boolean
    userId?: boolean
    chatRoomId?: boolean
  }

  export type UserChatInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | GeneralUserDefaultArgs<ExtArgs>
    chatRoom?: boolean | ChatRoomDefaultArgs<ExtArgs>
  }


  export type $UserChatPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserChat"
    objects: {
      user: Prisma.$GeneralUserPayload<ExtArgs>
      chatRoom: Prisma.$ChatRoomPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      chatRoomId: number
    }, ExtArgs["result"]["userChat"]>
    composites: {}
  }


  type UserChatGetPayload<S extends boolean | null | undefined | UserChatDefaultArgs> = $Result.GetResult<Prisma.$UserChatPayload, S>

  type UserChatCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<UserChatFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: UserChatCountAggregateInputType | true
    }

  export interface UserChatDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserChat'], meta: { name: 'UserChat' } }
    /**
     * Find zero or one UserChat that matches the filter.
     * @param {UserChatFindUniqueArgs} args - Arguments to find a UserChat
     * @example
     * // Get one UserChat
     * const userChat = await prisma.userChat.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends UserChatFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatFindUniqueArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one UserChat that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {UserChatFindUniqueOrThrowArgs} args - Arguments to find a UserChat
     * @example
     * // Get one UserChat
     * const userChat = await prisma.userChat.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends UserChatFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first UserChat that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatFindFirstArgs} args - Arguments to find a UserChat
     * @example
     * // Get one UserChat
     * const userChat = await prisma.userChat.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends UserChatFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatFindFirstArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first UserChat that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatFindFirstOrThrowArgs} args - Arguments to find a UserChat
     * @example
     * // Get one UserChat
     * const userChat = await prisma.userChat.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends UserChatFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more UserChats that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserChats
     * const userChats = await prisma.userChat.findMany()
     * 
     * // Get first 10 UserChats
     * const userChats = await prisma.userChat.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userChatWithIdOnly = await prisma.userChat.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends UserChatFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a UserChat.
     * @param {UserChatCreateArgs} args - Arguments to create a UserChat.
     * @example
     * // Create one UserChat
     * const UserChat = await prisma.userChat.create({
     *   data: {
     *     // ... data to create a UserChat
     *   }
     * })
     * 
    **/
    create<T extends UserChatCreateArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatCreateArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many UserChats.
     *     @param {UserChatCreateManyArgs} args - Arguments to create many UserChats.
     *     @example
     *     // Create many UserChats
     *     const userChat = await prisma.userChat.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends UserChatCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a UserChat.
     * @param {UserChatDeleteArgs} args - Arguments to delete one UserChat.
     * @example
     * // Delete one UserChat
     * const UserChat = await prisma.userChat.delete({
     *   where: {
     *     // ... filter to delete one UserChat
     *   }
     * })
     * 
    **/
    delete<T extends UserChatDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatDeleteArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one UserChat.
     * @param {UserChatUpdateArgs} args - Arguments to update one UserChat.
     * @example
     * // Update one UserChat
     * const userChat = await prisma.userChat.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends UserChatUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatUpdateArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more UserChats.
     * @param {UserChatDeleteManyArgs} args - Arguments to filter UserChats to delete.
     * @example
     * // Delete a few UserChats
     * const { count } = await prisma.userChat.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends UserChatDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, UserChatDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserChats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserChats
     * const userChat = await prisma.userChat.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends UserChatUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one UserChat.
     * @param {UserChatUpsertArgs} args - Arguments to update or create a UserChat.
     * @example
     * // Update or create a UserChat
     * const userChat = await prisma.userChat.upsert({
     *   create: {
     *     // ... data to create a UserChat
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserChat we want to update
     *   }
     * })
    **/
    upsert<T extends UserChatUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, UserChatUpsertArgs<ExtArgs>>
    ): Prisma__UserChatClient<$Result.GetResult<Prisma.$UserChatPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of UserChats.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatCountArgs} args - Arguments to filter UserChats to count.
     * @example
     * // Count the number of UserChats
     * const count = await prisma.userChat.count({
     *   where: {
     *     // ... the filter for the UserChats we want to count
     *   }
     * })
    **/
    count<T extends UserChatCountArgs>(
      args?: Subset<T, UserChatCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserChatCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserChat.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserChatAggregateArgs>(args: Subset<T, UserChatAggregateArgs>): Prisma.PrismaPromise<GetUserChatAggregateType<T>>

    /**
     * Group by UserChat.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserChatGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserChatGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserChatGroupByArgs['orderBy'] }
        : { orderBy?: UserChatGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserChatGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserChatGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserChat model
   */
  readonly fields: UserChatFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserChat.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserChatClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    user<T extends GeneralUserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, GeneralUserDefaultArgs<ExtArgs>>): Prisma__GeneralUserClient<$Result.GetResult<Prisma.$GeneralUserPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    chatRoom<T extends ChatRoomDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ChatRoomDefaultArgs<ExtArgs>>): Prisma__ChatRoomClient<$Result.GetResult<Prisma.$ChatRoomPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the UserChat model
   */ 
  interface UserChatFieldRefs {
    readonly id: FieldRef<"UserChat", 'Int'>
    readonly userId: FieldRef<"UserChat", 'Int'>
    readonly chatRoomId: FieldRef<"UserChat", 'Int'>
  }
    

  // Custom InputTypes

  /**
   * UserChat findUnique
   */
  export type UserChatFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter, which UserChat to fetch.
     */
    where: UserChatWhereUniqueInput
  }


  /**
   * UserChat findUniqueOrThrow
   */
  export type UserChatFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter, which UserChat to fetch.
     */
    where: UserChatWhereUniqueInput
  }


  /**
   * UserChat findFirst
   */
  export type UserChatFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter, which UserChat to fetch.
     */
    where?: UserChatWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserChats to fetch.
     */
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserChats.
     */
    cursor?: UserChatWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserChats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserChats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserChats.
     */
    distinct?: UserChatScalarFieldEnum | UserChatScalarFieldEnum[]
  }


  /**
   * UserChat findFirstOrThrow
   */
  export type UserChatFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter, which UserChat to fetch.
     */
    where?: UserChatWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserChats to fetch.
     */
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserChats.
     */
    cursor?: UserChatWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserChats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserChats.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserChats.
     */
    distinct?: UserChatScalarFieldEnum | UserChatScalarFieldEnum[]
  }


  /**
   * UserChat findMany
   */
  export type UserChatFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter, which UserChats to fetch.
     */
    where?: UserChatWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserChats to fetch.
     */
    orderBy?: UserChatOrderByWithRelationInput | UserChatOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserChats.
     */
    cursor?: UserChatWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserChats from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserChats.
     */
    skip?: number
    distinct?: UserChatScalarFieldEnum | UserChatScalarFieldEnum[]
  }


  /**
   * UserChat create
   */
  export type UserChatCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * The data needed to create a UserChat.
     */
    data: XOR<UserChatCreateInput, UserChatUncheckedCreateInput>
  }


  /**
   * UserChat createMany
   */
  export type UserChatCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserChats.
     */
    data: UserChatCreateManyInput | UserChatCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * UserChat update
   */
  export type UserChatUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * The data needed to update a UserChat.
     */
    data: XOR<UserChatUpdateInput, UserChatUncheckedUpdateInput>
    /**
     * Choose, which UserChat to update.
     */
    where: UserChatWhereUniqueInput
  }


  /**
   * UserChat updateMany
   */
  export type UserChatUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserChats.
     */
    data: XOR<UserChatUpdateManyMutationInput, UserChatUncheckedUpdateManyInput>
    /**
     * Filter which UserChats to update
     */
    where?: UserChatWhereInput
  }


  /**
   * UserChat upsert
   */
  export type UserChatUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * The filter to search for the UserChat to update in case it exists.
     */
    where: UserChatWhereUniqueInput
    /**
     * In case the UserChat found by the `where` argument doesn't exist, create a new UserChat with this data.
     */
    create: XOR<UserChatCreateInput, UserChatUncheckedCreateInput>
    /**
     * In case the UserChat was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserChatUpdateInput, UserChatUncheckedUpdateInput>
  }


  /**
   * UserChat delete
   */
  export type UserChatDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
    /**
     * Filter which UserChat to delete.
     */
    where: UserChatWhereUniqueInput
  }


  /**
   * UserChat deleteMany
   */
  export type UserChatDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserChats to delete
     */
    where?: UserChatWhereInput
  }


  /**
   * UserChat without action
   */
  export type UserChatDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserChat
     */
    select?: UserChatSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: UserChatInclude<ExtArgs> | null
  }



  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const OrganizationScalarFieldEnum: {
    id: 'id',
    name: 'name',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type OrganizationScalarFieldEnum = (typeof OrganizationScalarFieldEnum)[keyof typeof OrganizationScalarFieldEnum]


  export const CorporateUserScalarFieldEnum: {
    id: 'id',
    uuid: 'uuid',
    name: 'name',
    organizationId: 'organizationId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CorporateUserScalarFieldEnum = (typeof CorporateUserScalarFieldEnum)[keyof typeof CorporateUserScalarFieldEnum]


  export const GeneralUserScalarFieldEnum: {
    id: 'id',
    uuid: 'uuid',
    displayName: 'displayName',
    accountName: 'accountName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type GeneralUserScalarFieldEnum = (typeof GeneralUserScalarFieldEnum)[keyof typeof GeneralUserScalarFieldEnum]


  export const GeneralUserProfileScalarFieldEnum: {
    id: 'id',
    firstName: 'firstName',
    lastName: 'lastName',
    userId: 'userId',
    email: 'email',
    phoneNumber: 'phoneNumber'
  };

  export type GeneralUserProfileScalarFieldEnum = (typeof GeneralUserProfileScalarFieldEnum)[keyof typeof GeneralUserProfileScalarFieldEnum]


  export const AddressScalarFieldEnum: {
    id: 'id',
    street: 'street',
    city: 'city',
    state: 'state',
    postalCode: 'postalCode',
    country: 'country',
    profileId: 'profileId'
  };

  export type AddressScalarFieldEnum = (typeof AddressScalarFieldEnum)[keyof typeof AddressScalarFieldEnum]


  export const MessageScalarFieldEnum: {
    id: 'id',
    chatRoomId: 'chatRoomId',
    senderId: 'senderId',
    content: 'content',
    createdAt: 'createdAt'
  };

  export type MessageScalarFieldEnum = (typeof MessageScalarFieldEnum)[keyof typeof MessageScalarFieldEnum]


  export const ChatRoomScalarFieldEnum: {
    id: 'id',
    type: 'type',
    createdAt: 'createdAt'
  };

  export type ChatRoomScalarFieldEnum = (typeof ChatRoomScalarFieldEnum)[keyof typeof ChatRoomScalarFieldEnum]


  export const UserChatScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    chatRoomId: 'chatRoomId'
  };

  export type UserChatScalarFieldEnum = (typeof UserChatScalarFieldEnum)[keyof typeof UserChatScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'ChatType'
   */
  export type EnumChatTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ChatType'>
    


  /**
   * Reference to a field of type 'ChatType[]'
   */
  export type ListEnumChatTypeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'ChatType[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type OrganizationWhereInput = {
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    id?: IntFilter<"Organization"> | number
    name?: StringFilter<"Organization"> | string
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    users?: CorporateUserListRelationFilter
  }

  export type OrganizationOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    users?: CorporateUserOrderByRelationAggregateInput
  }

  export type OrganizationWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: OrganizationWhereInput | OrganizationWhereInput[]
    OR?: OrganizationWhereInput[]
    NOT?: OrganizationWhereInput | OrganizationWhereInput[]
    name?: StringFilter<"Organization"> | string
    createdAt?: DateTimeFilter<"Organization"> | Date | string
    updatedAt?: DateTimeFilter<"Organization"> | Date | string
    users?: CorporateUserListRelationFilter
  }, "id">

  export type OrganizationOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: OrganizationCountOrderByAggregateInput
    _avg?: OrganizationAvgOrderByAggregateInput
    _max?: OrganizationMaxOrderByAggregateInput
    _min?: OrganizationMinOrderByAggregateInput
    _sum?: OrganizationSumOrderByAggregateInput
  }

  export type OrganizationScalarWhereWithAggregatesInput = {
    AND?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    OR?: OrganizationScalarWhereWithAggregatesInput[]
    NOT?: OrganizationScalarWhereWithAggregatesInput | OrganizationScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Organization"> | number
    name?: StringWithAggregatesFilter<"Organization"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Organization"> | Date | string
  }

  export type CorporateUserWhereInput = {
    AND?: CorporateUserWhereInput | CorporateUserWhereInput[]
    OR?: CorporateUserWhereInput[]
    NOT?: CorporateUserWhereInput | CorporateUserWhereInput[]
    id?: IntFilter<"CorporateUser"> | number
    uuid?: UuidFilter<"CorporateUser"> | string
    name?: StringFilter<"CorporateUser"> | string
    organizationId?: IntFilter<"CorporateUser"> | number
    createdAt?: DateTimeFilter<"CorporateUser"> | Date | string
    updatedAt?: DateTimeFilter<"CorporateUser"> | Date | string
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
  }

  export type CorporateUserOrderByWithRelationInput = {
    id?: SortOrder
    uuid?: SortOrder
    name?: SortOrder
    organizationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    organization?: OrganizationOrderByWithRelationInput
  }

  export type CorporateUserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    uuid?: string
    AND?: CorporateUserWhereInput | CorporateUserWhereInput[]
    OR?: CorporateUserWhereInput[]
    NOT?: CorporateUserWhereInput | CorporateUserWhereInput[]
    name?: StringFilter<"CorporateUser"> | string
    organizationId?: IntFilter<"CorporateUser"> | number
    createdAt?: DateTimeFilter<"CorporateUser"> | Date | string
    updatedAt?: DateTimeFilter<"CorporateUser"> | Date | string
    organization?: XOR<OrganizationRelationFilter, OrganizationWhereInput>
  }, "id" | "uuid">

  export type CorporateUserOrderByWithAggregationInput = {
    id?: SortOrder
    uuid?: SortOrder
    name?: SortOrder
    organizationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CorporateUserCountOrderByAggregateInput
    _avg?: CorporateUserAvgOrderByAggregateInput
    _max?: CorporateUserMaxOrderByAggregateInput
    _min?: CorporateUserMinOrderByAggregateInput
    _sum?: CorporateUserSumOrderByAggregateInput
  }

  export type CorporateUserScalarWhereWithAggregatesInput = {
    AND?: CorporateUserScalarWhereWithAggregatesInput | CorporateUserScalarWhereWithAggregatesInput[]
    OR?: CorporateUserScalarWhereWithAggregatesInput[]
    NOT?: CorporateUserScalarWhereWithAggregatesInput | CorporateUserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CorporateUser"> | number
    uuid?: UuidWithAggregatesFilter<"CorporateUser"> | string
    name?: StringWithAggregatesFilter<"CorporateUser"> | string
    organizationId?: IntWithAggregatesFilter<"CorporateUser"> | number
    createdAt?: DateTimeWithAggregatesFilter<"CorporateUser"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"CorporateUser"> | Date | string
  }

  export type GeneralUserWhereInput = {
    AND?: GeneralUserWhereInput | GeneralUserWhereInput[]
    OR?: GeneralUserWhereInput[]
    NOT?: GeneralUserWhereInput | GeneralUserWhereInput[]
    id?: IntFilter<"GeneralUser"> | number
    uuid?: UuidFilter<"GeneralUser"> | string
    displayName?: StringFilter<"GeneralUser"> | string
    accountName?: StringFilter<"GeneralUser"> | string
    createdAt?: DateTimeFilter<"GeneralUser"> | Date | string
    updatedAt?: DateTimeFilter<"GeneralUser"> | Date | string
    profile?: XOR<GeneralUserProfileNullableRelationFilter, GeneralUserProfileWhereInput> | null
    Message?: MessageListRelationFilter
    UserChat?: UserChatListRelationFilter
  }

  export type GeneralUserOrderByWithRelationInput = {
    id?: SortOrder
    uuid?: SortOrder
    displayName?: SortOrder
    accountName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    profile?: GeneralUserProfileOrderByWithRelationInput
    Message?: MessageOrderByRelationAggregateInput
    UserChat?: UserChatOrderByRelationAggregateInput
  }

  export type GeneralUserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    uuid?: string
    accountName?: string
    AND?: GeneralUserWhereInput | GeneralUserWhereInput[]
    OR?: GeneralUserWhereInput[]
    NOT?: GeneralUserWhereInput | GeneralUserWhereInput[]
    displayName?: StringFilter<"GeneralUser"> | string
    createdAt?: DateTimeFilter<"GeneralUser"> | Date | string
    updatedAt?: DateTimeFilter<"GeneralUser"> | Date | string
    profile?: XOR<GeneralUserProfileNullableRelationFilter, GeneralUserProfileWhereInput> | null
    Message?: MessageListRelationFilter
    UserChat?: UserChatListRelationFilter
  }, "id" | "id" | "uuid" | "accountName">

  export type GeneralUserOrderByWithAggregationInput = {
    id?: SortOrder
    uuid?: SortOrder
    displayName?: SortOrder
    accountName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: GeneralUserCountOrderByAggregateInput
    _avg?: GeneralUserAvgOrderByAggregateInput
    _max?: GeneralUserMaxOrderByAggregateInput
    _min?: GeneralUserMinOrderByAggregateInput
    _sum?: GeneralUserSumOrderByAggregateInput
  }

  export type GeneralUserScalarWhereWithAggregatesInput = {
    AND?: GeneralUserScalarWhereWithAggregatesInput | GeneralUserScalarWhereWithAggregatesInput[]
    OR?: GeneralUserScalarWhereWithAggregatesInput[]
    NOT?: GeneralUserScalarWhereWithAggregatesInput | GeneralUserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"GeneralUser"> | number
    uuid?: UuidWithAggregatesFilter<"GeneralUser"> | string
    displayName?: StringWithAggregatesFilter<"GeneralUser"> | string
    accountName?: StringWithAggregatesFilter<"GeneralUser"> | string
    createdAt?: DateTimeWithAggregatesFilter<"GeneralUser"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"GeneralUser"> | Date | string
  }

  export type GeneralUserProfileWhereInput = {
    AND?: GeneralUserProfileWhereInput | GeneralUserProfileWhereInput[]
    OR?: GeneralUserProfileWhereInput[]
    NOT?: GeneralUserProfileWhereInput | GeneralUserProfileWhereInput[]
    id?: IntFilter<"GeneralUserProfile"> | number
    firstName?: StringFilter<"GeneralUserProfile"> | string
    lastName?: StringFilter<"GeneralUserProfile"> | string
    userId?: IntFilter<"GeneralUserProfile"> | number
    email?: StringFilter<"GeneralUserProfile"> | string
    phoneNumber?: StringNullableFilter<"GeneralUserProfile"> | string | null
    address?: XOR<AddressNullableRelationFilter, AddressWhereInput> | null
    generalUser?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
  }

  export type GeneralUserProfileOrderByWithRelationInput = {
    id?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    userId?: SortOrder
    email?: SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    address?: AddressOrderByWithRelationInput
    generalUser?: GeneralUserOrderByWithRelationInput
  }

  export type GeneralUserProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    userId?: number
    email?: string
    AND?: GeneralUserProfileWhereInput | GeneralUserProfileWhereInput[]
    OR?: GeneralUserProfileWhereInput[]
    NOT?: GeneralUserProfileWhereInput | GeneralUserProfileWhereInput[]
    firstName?: StringFilter<"GeneralUserProfile"> | string
    lastName?: StringFilter<"GeneralUserProfile"> | string
    phoneNumber?: StringNullableFilter<"GeneralUserProfile"> | string | null
    address?: XOR<AddressNullableRelationFilter, AddressWhereInput> | null
    generalUser?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
  }, "id" | "id" | "userId" | "email">

  export type GeneralUserProfileOrderByWithAggregationInput = {
    id?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    userId?: SortOrder
    email?: SortOrder
    phoneNumber?: SortOrderInput | SortOrder
    _count?: GeneralUserProfileCountOrderByAggregateInput
    _avg?: GeneralUserProfileAvgOrderByAggregateInput
    _max?: GeneralUserProfileMaxOrderByAggregateInput
    _min?: GeneralUserProfileMinOrderByAggregateInput
    _sum?: GeneralUserProfileSumOrderByAggregateInput
  }

  export type GeneralUserProfileScalarWhereWithAggregatesInput = {
    AND?: GeneralUserProfileScalarWhereWithAggregatesInput | GeneralUserProfileScalarWhereWithAggregatesInput[]
    OR?: GeneralUserProfileScalarWhereWithAggregatesInput[]
    NOT?: GeneralUserProfileScalarWhereWithAggregatesInput | GeneralUserProfileScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"GeneralUserProfile"> | number
    firstName?: StringWithAggregatesFilter<"GeneralUserProfile"> | string
    lastName?: StringWithAggregatesFilter<"GeneralUserProfile"> | string
    userId?: IntWithAggregatesFilter<"GeneralUserProfile"> | number
    email?: StringWithAggregatesFilter<"GeneralUserProfile"> | string
    phoneNumber?: StringNullableWithAggregatesFilter<"GeneralUserProfile"> | string | null
  }

  export type AddressWhereInput = {
    AND?: AddressWhereInput | AddressWhereInput[]
    OR?: AddressWhereInput[]
    NOT?: AddressWhereInput | AddressWhereInput[]
    id?: IntFilter<"Address"> | number
    street?: StringFilter<"Address"> | string
    city?: StringFilter<"Address"> | string
    state?: StringFilter<"Address"> | string
    postalCode?: StringFilter<"Address"> | string
    country?: StringFilter<"Address"> | string
    profileId?: IntNullableFilter<"Address"> | number | null
    generalUserProfile?: XOR<GeneralUserProfileNullableRelationFilter, GeneralUserProfileWhereInput> | null
  }

  export type AddressOrderByWithRelationInput = {
    id?: SortOrder
    street?: SortOrder
    city?: SortOrder
    state?: SortOrder
    postalCode?: SortOrder
    country?: SortOrder
    profileId?: SortOrderInput | SortOrder
    generalUserProfile?: GeneralUserProfileOrderByWithRelationInput
  }

  export type AddressWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    profileId?: number
    AND?: AddressWhereInput | AddressWhereInput[]
    OR?: AddressWhereInput[]
    NOT?: AddressWhereInput | AddressWhereInput[]
    street?: StringFilter<"Address"> | string
    city?: StringFilter<"Address"> | string
    state?: StringFilter<"Address"> | string
    postalCode?: StringFilter<"Address"> | string
    country?: StringFilter<"Address"> | string
    generalUserProfile?: XOR<GeneralUserProfileNullableRelationFilter, GeneralUserProfileWhereInput> | null
  }, "id" | "id" | "profileId">

  export type AddressOrderByWithAggregationInput = {
    id?: SortOrder
    street?: SortOrder
    city?: SortOrder
    state?: SortOrder
    postalCode?: SortOrder
    country?: SortOrder
    profileId?: SortOrderInput | SortOrder
    _count?: AddressCountOrderByAggregateInput
    _avg?: AddressAvgOrderByAggregateInput
    _max?: AddressMaxOrderByAggregateInput
    _min?: AddressMinOrderByAggregateInput
    _sum?: AddressSumOrderByAggregateInput
  }

  export type AddressScalarWhereWithAggregatesInput = {
    AND?: AddressScalarWhereWithAggregatesInput | AddressScalarWhereWithAggregatesInput[]
    OR?: AddressScalarWhereWithAggregatesInput[]
    NOT?: AddressScalarWhereWithAggregatesInput | AddressScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Address"> | number
    street?: StringWithAggregatesFilter<"Address"> | string
    city?: StringWithAggregatesFilter<"Address"> | string
    state?: StringWithAggregatesFilter<"Address"> | string
    postalCode?: StringWithAggregatesFilter<"Address"> | string
    country?: StringWithAggregatesFilter<"Address"> | string
    profileId?: IntNullableWithAggregatesFilter<"Address"> | number | null
  }

  export type MessageWhereInput = {
    AND?: MessageWhereInput | MessageWhereInput[]
    OR?: MessageWhereInput[]
    NOT?: MessageWhereInput | MessageWhereInput[]
    id?: IntFilter<"Message"> | number
    chatRoomId?: IntFilter<"Message"> | number
    senderId?: IntFilter<"Message"> | number
    content?: StringFilter<"Message"> | string
    createdAt?: DateTimeFilter<"Message"> | Date | string
    chat?: XOR<ChatRoomRelationFilter, ChatRoomWhereInput>
    sender?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
  }

  export type MessageOrderByWithRelationInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    chat?: ChatRoomOrderByWithRelationInput
    sender?: GeneralUserOrderByWithRelationInput
  }

  export type MessageWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: MessageWhereInput | MessageWhereInput[]
    OR?: MessageWhereInput[]
    NOT?: MessageWhereInput | MessageWhereInput[]
    chatRoomId?: IntFilter<"Message"> | number
    senderId?: IntFilter<"Message"> | number
    content?: StringFilter<"Message"> | string
    createdAt?: DateTimeFilter<"Message"> | Date | string
    chat?: XOR<ChatRoomRelationFilter, ChatRoomWhereInput>
    sender?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
  }, "id" | "id">

  export type MessageOrderByWithAggregationInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
    _count?: MessageCountOrderByAggregateInput
    _avg?: MessageAvgOrderByAggregateInput
    _max?: MessageMaxOrderByAggregateInput
    _min?: MessageMinOrderByAggregateInput
    _sum?: MessageSumOrderByAggregateInput
  }

  export type MessageScalarWhereWithAggregatesInput = {
    AND?: MessageScalarWhereWithAggregatesInput | MessageScalarWhereWithAggregatesInput[]
    OR?: MessageScalarWhereWithAggregatesInput[]
    NOT?: MessageScalarWhereWithAggregatesInput | MessageScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Message"> | number
    chatRoomId?: IntWithAggregatesFilter<"Message"> | number
    senderId?: IntWithAggregatesFilter<"Message"> | number
    content?: StringWithAggregatesFilter<"Message"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Message"> | Date | string
  }

  export type ChatRoomWhereInput = {
    AND?: ChatRoomWhereInput | ChatRoomWhereInput[]
    OR?: ChatRoomWhereInput[]
    NOT?: ChatRoomWhereInput | ChatRoomWhereInput[]
    id?: IntFilter<"ChatRoom"> | number
    type?: EnumChatTypeFilter<"ChatRoom"> | $Enums.ChatType
    createdAt?: DateTimeFilter<"ChatRoom"> | Date | string
    messages?: MessageListRelationFilter
    userChats?: UserChatListRelationFilter
  }

  export type ChatRoomOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    messages?: MessageOrderByRelationAggregateInput
    userChats?: UserChatOrderByRelationAggregateInput
  }

  export type ChatRoomWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ChatRoomWhereInput | ChatRoomWhereInput[]
    OR?: ChatRoomWhereInput[]
    NOT?: ChatRoomWhereInput | ChatRoomWhereInput[]
    type?: EnumChatTypeFilter<"ChatRoom"> | $Enums.ChatType
    createdAt?: DateTimeFilter<"ChatRoom"> | Date | string
    messages?: MessageListRelationFilter
    userChats?: UserChatListRelationFilter
  }, "id" | "id">

  export type ChatRoomOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
    _count?: ChatRoomCountOrderByAggregateInput
    _avg?: ChatRoomAvgOrderByAggregateInput
    _max?: ChatRoomMaxOrderByAggregateInput
    _min?: ChatRoomMinOrderByAggregateInput
    _sum?: ChatRoomSumOrderByAggregateInput
  }

  export type ChatRoomScalarWhereWithAggregatesInput = {
    AND?: ChatRoomScalarWhereWithAggregatesInput | ChatRoomScalarWhereWithAggregatesInput[]
    OR?: ChatRoomScalarWhereWithAggregatesInput[]
    NOT?: ChatRoomScalarWhereWithAggregatesInput | ChatRoomScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ChatRoom"> | number
    type?: EnumChatTypeWithAggregatesFilter<"ChatRoom"> | $Enums.ChatType
    createdAt?: DateTimeWithAggregatesFilter<"ChatRoom"> | Date | string
  }

  export type UserChatWhereInput = {
    AND?: UserChatWhereInput | UserChatWhereInput[]
    OR?: UserChatWhereInput[]
    NOT?: UserChatWhereInput | UserChatWhereInput[]
    id?: IntFilter<"UserChat"> | number
    userId?: IntFilter<"UserChat"> | number
    chatRoomId?: IntFilter<"UserChat"> | number
    user?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
    chatRoom?: XOR<ChatRoomRelationFilter, ChatRoomWhereInput>
  }

  export type UserChatOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
    user?: GeneralUserOrderByWithRelationInput
    chatRoom?: ChatRoomOrderByWithRelationInput
  }

  export type UserChatWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    userId_chatRoomId?: UserChatUserIdChatRoomIdCompoundUniqueInput
    AND?: UserChatWhereInput | UserChatWhereInput[]
    OR?: UserChatWhereInput[]
    NOT?: UserChatWhereInput | UserChatWhereInput[]
    userId?: IntFilter<"UserChat"> | number
    chatRoomId?: IntFilter<"UserChat"> | number
    user?: XOR<GeneralUserRelationFilter, GeneralUserWhereInput>
    chatRoom?: XOR<ChatRoomRelationFilter, ChatRoomWhereInput>
  }, "id" | "id" | "userId_chatRoomId">

  export type UserChatOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
    _count?: UserChatCountOrderByAggregateInput
    _avg?: UserChatAvgOrderByAggregateInput
    _max?: UserChatMaxOrderByAggregateInput
    _min?: UserChatMinOrderByAggregateInput
    _sum?: UserChatSumOrderByAggregateInput
  }

  export type UserChatScalarWhereWithAggregatesInput = {
    AND?: UserChatScalarWhereWithAggregatesInput | UserChatScalarWhereWithAggregatesInput[]
    OR?: UserChatScalarWhereWithAggregatesInput[]
    NOT?: UserChatScalarWhereWithAggregatesInput | UserChatScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"UserChat"> | number
    userId?: IntWithAggregatesFilter<"UserChat"> | number
    chatRoomId?: IntWithAggregatesFilter<"UserChat"> | number
  }

  export type OrganizationCreateInput = {
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: CorporateUserCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUncheckedCreateInput = {
    id?: number
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
    users?: CorporateUserUncheckedCreateNestedManyWithoutOrganizationInput
  }

  export type OrganizationUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: CorporateUserUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    users?: CorporateUserUncheckedUpdateManyWithoutOrganizationNestedInput
  }

  export type OrganizationCreateManyInput = {
    id?: number
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CorporateUserCreateInput = {
    uuid: string
    name?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    organization: OrganizationCreateNestedOneWithoutUsersInput
  }

  export type CorporateUserUncheckedCreateInput = {
    id?: number
    uuid: string
    name?: string
    organizationId: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CorporateUserUpdateInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    organization?: OrganizationUpdateOneRequiredWithoutUsersNestedInput
  }

  export type CorporateUserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    organizationId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CorporateUserCreateManyInput = {
    id?: number
    uuid: string
    name?: string
    organizationId: number
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CorporateUserUpdateManyMutationInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CorporateUserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    organizationId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeneralUserCreateInput = {
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileCreateNestedOneWithoutGeneralUserInput
    Message?: MessageCreateNestedManyWithoutSenderInput
    UserChat?: UserChatCreateNestedManyWithoutUserInput
  }

  export type GeneralUserUncheckedCreateInput = {
    id?: number
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileUncheckedCreateNestedOneWithoutGeneralUserInput
    Message?: MessageUncheckedCreateNestedManyWithoutSenderInput
    UserChat?: UserChatUncheckedCreateNestedManyWithoutUserInput
  }

  export type GeneralUserUpdateInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUpdateOneWithoutGeneralUserNestedInput
    Message?: MessageUpdateManyWithoutSenderNestedInput
    UserChat?: UserChatUpdateManyWithoutUserNestedInput
  }

  export type GeneralUserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUncheckedUpdateOneWithoutGeneralUserNestedInput
    Message?: MessageUncheckedUpdateManyWithoutSenderNestedInput
    UserChat?: UserChatUncheckedUpdateManyWithoutUserNestedInput
  }

  export type GeneralUserCreateManyInput = {
    id?: number
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type GeneralUserUpdateManyMutationInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeneralUserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeneralUserProfileCreateInput = {
    firstName?: string
    lastName?: string
    email: string
    phoneNumber?: string | null
    address?: AddressCreateNestedOneWithoutGeneralUserProfileInput
    generalUser: GeneralUserCreateNestedOneWithoutProfileInput
  }

  export type GeneralUserProfileUncheckedCreateInput = {
    id?: number
    firstName?: string
    lastName?: string
    userId: number
    email: string
    phoneNumber?: string | null
    address?: AddressUncheckedCreateNestedOneWithoutGeneralUserProfileInput
  }

  export type GeneralUserProfileUpdateInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    address?: AddressUpdateOneWithoutGeneralUserProfileNestedInput
    generalUser?: GeneralUserUpdateOneRequiredWithoutProfileNestedInput
  }

  export type GeneralUserProfileUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    userId?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    address?: AddressUncheckedUpdateOneWithoutGeneralUserProfileNestedInput
  }

  export type GeneralUserProfileCreateManyInput = {
    id?: number
    firstName?: string
    lastName?: string
    userId: number
    email: string
    phoneNumber?: string | null
  }

  export type GeneralUserProfileUpdateManyMutationInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type GeneralUserProfileUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    userId?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type AddressCreateInput = {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    generalUserProfile?: GeneralUserProfileCreateNestedOneWithoutAddressInput
  }

  export type AddressUncheckedCreateInput = {
    id?: number
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    profileId?: number | null
  }

  export type AddressUpdateInput = {
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    generalUserProfile?: GeneralUserProfileUpdateOneWithoutAddressNestedInput
  }

  export type AddressUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    profileId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type AddressCreateManyInput = {
    id?: number
    street: string
    city: string
    state: string
    postalCode: string
    country: string
    profileId?: number | null
  }

  export type AddressUpdateManyMutationInput = {
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
  }

  export type AddressUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
    profileId?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type MessageCreateInput = {
    content: string
    createdAt?: Date | string
    chat: ChatRoomCreateNestedOneWithoutMessagesInput
    sender: GeneralUserCreateNestedOneWithoutMessageInput
  }

  export type MessageUncheckedCreateInput = {
    id?: number
    chatRoomId: number
    senderId: number
    content: string
    createdAt?: Date | string
  }

  export type MessageUpdateInput = {
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chat?: ChatRoomUpdateOneRequiredWithoutMessagesNestedInput
    sender?: GeneralUserUpdateOneRequiredWithoutMessageNestedInput
  }

  export type MessageUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
    senderId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageCreateManyInput = {
    id?: number
    chatRoomId: number
    senderId: number
    content: string
    createdAt?: Date | string
  }

  export type MessageUpdateManyMutationInput = {
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
    senderId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatRoomCreateInput = {
    type: $Enums.ChatType
    createdAt?: Date | string
    messages?: MessageCreateNestedManyWithoutChatInput
    userChats?: UserChatCreateNestedManyWithoutChatRoomInput
  }

  export type ChatRoomUncheckedCreateInput = {
    id?: number
    type: $Enums.ChatType
    createdAt?: Date | string
    messages?: MessageUncheckedCreateNestedManyWithoutChatInput
    userChats?: UserChatUncheckedCreateNestedManyWithoutChatRoomInput
  }

  export type ChatRoomUpdateInput = {
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: MessageUpdateManyWithoutChatNestedInput
    userChats?: UserChatUpdateManyWithoutChatRoomNestedInput
  }

  export type ChatRoomUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: MessageUncheckedUpdateManyWithoutChatNestedInput
    userChats?: UserChatUncheckedUpdateManyWithoutChatRoomNestedInput
  }

  export type ChatRoomCreateManyInput = {
    id?: number
    type: $Enums.ChatType
    createdAt?: Date | string
  }

  export type ChatRoomUpdateManyMutationInput = {
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChatRoomUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserChatCreateInput = {
    user: GeneralUserCreateNestedOneWithoutUserChatInput
    chatRoom: ChatRoomCreateNestedOneWithoutUserChatsInput
  }

  export type UserChatUncheckedCreateInput = {
    id?: number
    userId: number
    chatRoomId: number
  }

  export type UserChatUpdateInput = {
    user?: GeneralUserUpdateOneRequiredWithoutUserChatNestedInput
    chatRoom?: ChatRoomUpdateOneRequiredWithoutUserChatsNestedInput
  }

  export type UserChatUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
  }

  export type UserChatCreateManyInput = {
    id?: number
    userId: number
    chatRoomId: number
  }

  export type UserChatUpdateManyMutationInput = {

  }

  export type UserChatUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type CorporateUserListRelationFilter = {
    every?: CorporateUserWhereInput
    some?: CorporateUserWhereInput
    none?: CorporateUserWhereInput
  }

  export type CorporateUserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type OrganizationCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrganizationAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type OrganizationMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrganizationMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type OrganizationSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type OrganizationRelationFilter = {
    is?: OrganizationWhereInput
    isNot?: OrganizationWhereInput
  }

  export type CorporateUserCountOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    name?: SortOrder
    organizationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CorporateUserAvgOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
  }

  export type CorporateUserMaxOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    name?: SortOrder
    organizationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CorporateUserMinOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    name?: SortOrder
    organizationId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CorporateUserSumOrderByAggregateInput = {
    id?: SortOrder
    organizationId?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type GeneralUserProfileNullableRelationFilter = {
    is?: GeneralUserProfileWhereInput | null
    isNot?: GeneralUserProfileWhereInput | null
  }

  export type MessageListRelationFilter = {
    every?: MessageWhereInput
    some?: MessageWhereInput
    none?: MessageWhereInput
  }

  export type UserChatListRelationFilter = {
    every?: UserChatWhereInput
    some?: UserChatWhereInput
    none?: UserChatWhereInput
  }

  export type MessageOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserChatOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type GeneralUserCountOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    displayName?: SortOrder
    accountName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GeneralUserAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type GeneralUserMaxOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    displayName?: SortOrder
    accountName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GeneralUserMinOrderByAggregateInput = {
    id?: SortOrder
    uuid?: SortOrder
    displayName?: SortOrder
    accountName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type GeneralUserSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type AddressNullableRelationFilter = {
    is?: AddressWhereInput | null
    isNot?: AddressWhereInput | null
  }

  export type GeneralUserRelationFilter = {
    is?: GeneralUserWhereInput
    isNot?: GeneralUserWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type GeneralUserProfileCountOrderByAggregateInput = {
    id?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    userId?: SortOrder
    email?: SortOrder
    phoneNumber?: SortOrder
  }

  export type GeneralUserProfileAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type GeneralUserProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    userId?: SortOrder
    email?: SortOrder
    phoneNumber?: SortOrder
  }

  export type GeneralUserProfileMinOrderByAggregateInput = {
    id?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    userId?: SortOrder
    email?: SortOrder
    phoneNumber?: SortOrder
  }

  export type GeneralUserProfileSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type AddressCountOrderByAggregateInput = {
    id?: SortOrder
    street?: SortOrder
    city?: SortOrder
    state?: SortOrder
    postalCode?: SortOrder
    country?: SortOrder
    profileId?: SortOrder
  }

  export type AddressAvgOrderByAggregateInput = {
    id?: SortOrder
    profileId?: SortOrder
  }

  export type AddressMaxOrderByAggregateInput = {
    id?: SortOrder
    street?: SortOrder
    city?: SortOrder
    state?: SortOrder
    postalCode?: SortOrder
    country?: SortOrder
    profileId?: SortOrder
  }

  export type AddressMinOrderByAggregateInput = {
    id?: SortOrder
    street?: SortOrder
    city?: SortOrder
    state?: SortOrder
    postalCode?: SortOrder
    country?: SortOrder
    profileId?: SortOrder
  }

  export type AddressSumOrderByAggregateInput = {
    id?: SortOrder
    profileId?: SortOrder
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type ChatRoomRelationFilter = {
    is?: ChatRoomWhereInput
    isNot?: ChatRoomWhereInput
  }

  export type MessageCountOrderByAggregateInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageAvgOrderByAggregateInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
  }

  export type MessageMaxOrderByAggregateInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageMinOrderByAggregateInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
    content?: SortOrder
    createdAt?: SortOrder
  }

  export type MessageSumOrderByAggregateInput = {
    id?: SortOrder
    chatRoomId?: SortOrder
    senderId?: SortOrder
  }

  export type EnumChatTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ChatType | EnumChatTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChatTypeFilter<$PrismaModel> | $Enums.ChatType
  }

  export type ChatRoomCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatRoomAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ChatRoomMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatRoomMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    createdAt?: SortOrder
  }

  export type ChatRoomSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumChatTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ChatType | EnumChatTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChatTypeWithAggregatesFilter<$PrismaModel> | $Enums.ChatType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumChatTypeFilter<$PrismaModel>
    _max?: NestedEnumChatTypeFilter<$PrismaModel>
  }

  export type UserChatUserIdChatRoomIdCompoundUniqueInput = {
    userId: number
    chatRoomId: number
  }

  export type UserChatCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
  }

  export type UserChatAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
  }

  export type UserChatMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
  }

  export type UserChatMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
  }

  export type UserChatSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    chatRoomId?: SortOrder
  }

  export type CorporateUserCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput> | CorporateUserCreateWithoutOrganizationInput[] | CorporateUserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: CorporateUserCreateOrConnectWithoutOrganizationInput | CorporateUserCreateOrConnectWithoutOrganizationInput[]
    createMany?: CorporateUserCreateManyOrganizationInputEnvelope
    connect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
  }

  export type CorporateUserUncheckedCreateNestedManyWithoutOrganizationInput = {
    create?: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput> | CorporateUserCreateWithoutOrganizationInput[] | CorporateUserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: CorporateUserCreateOrConnectWithoutOrganizationInput | CorporateUserCreateOrConnectWithoutOrganizationInput[]
    createMany?: CorporateUserCreateManyOrganizationInputEnvelope
    connect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type CorporateUserUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput> | CorporateUserCreateWithoutOrganizationInput[] | CorporateUserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: CorporateUserCreateOrConnectWithoutOrganizationInput | CorporateUserCreateOrConnectWithoutOrganizationInput[]
    upsert?: CorporateUserUpsertWithWhereUniqueWithoutOrganizationInput | CorporateUserUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: CorporateUserCreateManyOrganizationInputEnvelope
    set?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    disconnect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    delete?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    connect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    update?: CorporateUserUpdateWithWhereUniqueWithoutOrganizationInput | CorporateUserUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: CorporateUserUpdateManyWithWhereWithoutOrganizationInput | CorporateUserUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: CorporateUserScalarWhereInput | CorporateUserScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type CorporateUserUncheckedUpdateManyWithoutOrganizationNestedInput = {
    create?: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput> | CorporateUserCreateWithoutOrganizationInput[] | CorporateUserUncheckedCreateWithoutOrganizationInput[]
    connectOrCreate?: CorporateUserCreateOrConnectWithoutOrganizationInput | CorporateUserCreateOrConnectWithoutOrganizationInput[]
    upsert?: CorporateUserUpsertWithWhereUniqueWithoutOrganizationInput | CorporateUserUpsertWithWhereUniqueWithoutOrganizationInput[]
    createMany?: CorporateUserCreateManyOrganizationInputEnvelope
    set?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    disconnect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    delete?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    connect?: CorporateUserWhereUniqueInput | CorporateUserWhereUniqueInput[]
    update?: CorporateUserUpdateWithWhereUniqueWithoutOrganizationInput | CorporateUserUpdateWithWhereUniqueWithoutOrganizationInput[]
    updateMany?: CorporateUserUpdateManyWithWhereWithoutOrganizationInput | CorporateUserUpdateManyWithWhereWithoutOrganizationInput[]
    deleteMany?: CorporateUserScalarWhereInput | CorporateUserScalarWhereInput[]
  }

  export type OrganizationCreateNestedOneWithoutUsersInput = {
    create?: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUsersInput
    connect?: OrganizationWhereUniqueInput
  }

  export type OrganizationUpdateOneRequiredWithoutUsersNestedInput = {
    create?: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    connectOrCreate?: OrganizationCreateOrConnectWithoutUsersInput
    upsert?: OrganizationUpsertWithoutUsersInput
    connect?: OrganizationWhereUniqueInput
    update?: XOR<XOR<OrganizationUpdateToOneWithWhereWithoutUsersInput, OrganizationUpdateWithoutUsersInput>, OrganizationUncheckedUpdateWithoutUsersInput>
  }

  export type GeneralUserProfileCreateNestedOneWithoutGeneralUserInput = {
    create?: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutGeneralUserInput
    connect?: GeneralUserProfileWhereUniqueInput
  }

  export type MessageCreateNestedManyWithoutSenderInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type UserChatCreateNestedManyWithoutUserInput = {
    create?: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput> | UserChatCreateWithoutUserInput[] | UserChatUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutUserInput | UserChatCreateOrConnectWithoutUserInput[]
    createMany?: UserChatCreateManyUserInputEnvelope
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
  }

  export type GeneralUserProfileUncheckedCreateNestedOneWithoutGeneralUserInput = {
    create?: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutGeneralUserInput
    connect?: GeneralUserProfileWhereUniqueInput
  }

  export type MessageUncheckedCreateNestedManyWithoutSenderInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type UserChatUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput> | UserChatCreateWithoutUserInput[] | UserChatUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutUserInput | UserChatCreateOrConnectWithoutUserInput[]
    createMany?: UserChatCreateManyUserInputEnvelope
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
  }

  export type GeneralUserProfileUpdateOneWithoutGeneralUserNestedInput = {
    create?: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutGeneralUserInput
    upsert?: GeneralUserProfileUpsertWithoutGeneralUserInput
    disconnect?: GeneralUserProfileWhereInput | boolean
    delete?: GeneralUserProfileWhereInput | boolean
    connect?: GeneralUserProfileWhereUniqueInput
    update?: XOR<XOR<GeneralUserProfileUpdateToOneWithWhereWithoutGeneralUserInput, GeneralUserProfileUpdateWithoutGeneralUserInput>, GeneralUserProfileUncheckedUpdateWithoutGeneralUserInput>
  }

  export type MessageUpdateManyWithoutSenderNestedInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutSenderInput | MessageUpsertWithWhereUniqueWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutSenderInput | MessageUpdateWithWhereUniqueWithoutSenderInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutSenderInput | MessageUpdateManyWithWhereWithoutSenderInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type UserChatUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput> | UserChatCreateWithoutUserInput[] | UserChatUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutUserInput | UserChatCreateOrConnectWithoutUserInput[]
    upsert?: UserChatUpsertWithWhereUniqueWithoutUserInput | UserChatUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserChatCreateManyUserInputEnvelope
    set?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    disconnect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    delete?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    update?: UserChatUpdateWithWhereUniqueWithoutUserInput | UserChatUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserChatUpdateManyWithWhereWithoutUserInput | UserChatUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
  }

  export type GeneralUserProfileUncheckedUpdateOneWithoutGeneralUserNestedInput = {
    create?: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutGeneralUserInput
    upsert?: GeneralUserProfileUpsertWithoutGeneralUserInput
    disconnect?: GeneralUserProfileWhereInput | boolean
    delete?: GeneralUserProfileWhereInput | boolean
    connect?: GeneralUserProfileWhereUniqueInput
    update?: XOR<XOR<GeneralUserProfileUpdateToOneWithWhereWithoutGeneralUserInput, GeneralUserProfileUpdateWithoutGeneralUserInput>, GeneralUserProfileUncheckedUpdateWithoutGeneralUserInput>
  }

  export type MessageUncheckedUpdateManyWithoutSenderNestedInput = {
    create?: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput> | MessageCreateWithoutSenderInput[] | MessageUncheckedCreateWithoutSenderInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutSenderInput | MessageCreateOrConnectWithoutSenderInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutSenderInput | MessageUpsertWithWhereUniqueWithoutSenderInput[]
    createMany?: MessageCreateManySenderInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutSenderInput | MessageUpdateWithWhereUniqueWithoutSenderInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutSenderInput | MessageUpdateManyWithWhereWithoutSenderInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type UserChatUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput> | UserChatCreateWithoutUserInput[] | UserChatUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutUserInput | UserChatCreateOrConnectWithoutUserInput[]
    upsert?: UserChatUpsertWithWhereUniqueWithoutUserInput | UserChatUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserChatCreateManyUserInputEnvelope
    set?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    disconnect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    delete?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    update?: UserChatUpdateWithWhereUniqueWithoutUserInput | UserChatUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserChatUpdateManyWithWhereWithoutUserInput | UserChatUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
  }

  export type AddressCreateNestedOneWithoutGeneralUserProfileInput = {
    create?: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
    connectOrCreate?: AddressCreateOrConnectWithoutGeneralUserProfileInput
    connect?: AddressWhereUniqueInput
  }

  export type GeneralUserCreateNestedOneWithoutProfileInput = {
    create?: XOR<GeneralUserCreateWithoutProfileInput, GeneralUserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutProfileInput
    connect?: GeneralUserWhereUniqueInput
  }

  export type AddressUncheckedCreateNestedOneWithoutGeneralUserProfileInput = {
    create?: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
    connectOrCreate?: AddressCreateOrConnectWithoutGeneralUserProfileInput
    connect?: AddressWhereUniqueInput
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type AddressUpdateOneWithoutGeneralUserProfileNestedInput = {
    create?: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
    connectOrCreate?: AddressCreateOrConnectWithoutGeneralUserProfileInput
    upsert?: AddressUpsertWithoutGeneralUserProfileInput
    disconnect?: AddressWhereInput | boolean
    delete?: AddressWhereInput | boolean
    connect?: AddressWhereUniqueInput
    update?: XOR<XOR<AddressUpdateToOneWithWhereWithoutGeneralUserProfileInput, AddressUpdateWithoutGeneralUserProfileInput>, AddressUncheckedUpdateWithoutGeneralUserProfileInput>
  }

  export type GeneralUserUpdateOneRequiredWithoutProfileNestedInput = {
    create?: XOR<GeneralUserCreateWithoutProfileInput, GeneralUserUncheckedCreateWithoutProfileInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutProfileInput
    upsert?: GeneralUserUpsertWithoutProfileInput
    connect?: GeneralUserWhereUniqueInput
    update?: XOR<XOR<GeneralUserUpdateToOneWithWhereWithoutProfileInput, GeneralUserUpdateWithoutProfileInput>, GeneralUserUncheckedUpdateWithoutProfileInput>
  }

  export type AddressUncheckedUpdateOneWithoutGeneralUserProfileNestedInput = {
    create?: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
    connectOrCreate?: AddressCreateOrConnectWithoutGeneralUserProfileInput
    upsert?: AddressUpsertWithoutGeneralUserProfileInput
    disconnect?: AddressWhereInput | boolean
    delete?: AddressWhereInput | boolean
    connect?: AddressWhereUniqueInput
    update?: XOR<XOR<AddressUpdateToOneWithWhereWithoutGeneralUserProfileInput, AddressUpdateWithoutGeneralUserProfileInput>, AddressUncheckedUpdateWithoutGeneralUserProfileInput>
  }

  export type GeneralUserProfileCreateNestedOneWithoutAddressInput = {
    create?: XOR<GeneralUserProfileCreateWithoutAddressInput, GeneralUserProfileUncheckedCreateWithoutAddressInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutAddressInput
    connect?: GeneralUserProfileWhereUniqueInput
  }

  export type GeneralUserProfileUpdateOneWithoutAddressNestedInput = {
    create?: XOR<GeneralUserProfileCreateWithoutAddressInput, GeneralUserProfileUncheckedCreateWithoutAddressInput>
    connectOrCreate?: GeneralUserProfileCreateOrConnectWithoutAddressInput
    upsert?: GeneralUserProfileUpsertWithoutAddressInput
    disconnect?: GeneralUserProfileWhereInput | boolean
    delete?: GeneralUserProfileWhereInput | boolean
    connect?: GeneralUserProfileWhereUniqueInput
    update?: XOR<XOR<GeneralUserProfileUpdateToOneWithWhereWithoutAddressInput, GeneralUserProfileUpdateWithoutAddressInput>, GeneralUserProfileUncheckedUpdateWithoutAddressInput>
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ChatRoomCreateNestedOneWithoutMessagesInput = {
    create?: XOR<ChatRoomCreateWithoutMessagesInput, ChatRoomUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: ChatRoomCreateOrConnectWithoutMessagesInput
    connect?: ChatRoomWhereUniqueInput
  }

  export type GeneralUserCreateNestedOneWithoutMessageInput = {
    create?: XOR<GeneralUserCreateWithoutMessageInput, GeneralUserUncheckedCreateWithoutMessageInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutMessageInput
    connect?: GeneralUserWhereUniqueInput
  }

  export type ChatRoomUpdateOneRequiredWithoutMessagesNestedInput = {
    create?: XOR<ChatRoomCreateWithoutMessagesInput, ChatRoomUncheckedCreateWithoutMessagesInput>
    connectOrCreate?: ChatRoomCreateOrConnectWithoutMessagesInput
    upsert?: ChatRoomUpsertWithoutMessagesInput
    connect?: ChatRoomWhereUniqueInput
    update?: XOR<XOR<ChatRoomUpdateToOneWithWhereWithoutMessagesInput, ChatRoomUpdateWithoutMessagesInput>, ChatRoomUncheckedUpdateWithoutMessagesInput>
  }

  export type GeneralUserUpdateOneRequiredWithoutMessageNestedInput = {
    create?: XOR<GeneralUserCreateWithoutMessageInput, GeneralUserUncheckedCreateWithoutMessageInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutMessageInput
    upsert?: GeneralUserUpsertWithoutMessageInput
    connect?: GeneralUserWhereUniqueInput
    update?: XOR<XOR<GeneralUserUpdateToOneWithWhereWithoutMessageInput, GeneralUserUpdateWithoutMessageInput>, GeneralUserUncheckedUpdateWithoutMessageInput>
  }

  export type MessageCreateNestedManyWithoutChatInput = {
    create?: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput> | MessageCreateWithoutChatInput[] | MessageUncheckedCreateWithoutChatInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutChatInput | MessageCreateOrConnectWithoutChatInput[]
    createMany?: MessageCreateManyChatInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type UserChatCreateNestedManyWithoutChatRoomInput = {
    create?: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput> | UserChatCreateWithoutChatRoomInput[] | UserChatUncheckedCreateWithoutChatRoomInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutChatRoomInput | UserChatCreateOrConnectWithoutChatRoomInput[]
    createMany?: UserChatCreateManyChatRoomInputEnvelope
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
  }

  export type MessageUncheckedCreateNestedManyWithoutChatInput = {
    create?: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput> | MessageCreateWithoutChatInput[] | MessageUncheckedCreateWithoutChatInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutChatInput | MessageCreateOrConnectWithoutChatInput[]
    createMany?: MessageCreateManyChatInputEnvelope
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
  }

  export type UserChatUncheckedCreateNestedManyWithoutChatRoomInput = {
    create?: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput> | UserChatCreateWithoutChatRoomInput[] | UserChatUncheckedCreateWithoutChatRoomInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutChatRoomInput | UserChatCreateOrConnectWithoutChatRoomInput[]
    createMany?: UserChatCreateManyChatRoomInputEnvelope
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
  }

  export type EnumChatTypeFieldUpdateOperationsInput = {
    set?: $Enums.ChatType
  }

  export type MessageUpdateManyWithoutChatNestedInput = {
    create?: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput> | MessageCreateWithoutChatInput[] | MessageUncheckedCreateWithoutChatInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutChatInput | MessageCreateOrConnectWithoutChatInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutChatInput | MessageUpsertWithWhereUniqueWithoutChatInput[]
    createMany?: MessageCreateManyChatInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutChatInput | MessageUpdateWithWhereUniqueWithoutChatInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutChatInput | MessageUpdateManyWithWhereWithoutChatInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type UserChatUpdateManyWithoutChatRoomNestedInput = {
    create?: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput> | UserChatCreateWithoutChatRoomInput[] | UserChatUncheckedCreateWithoutChatRoomInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutChatRoomInput | UserChatCreateOrConnectWithoutChatRoomInput[]
    upsert?: UserChatUpsertWithWhereUniqueWithoutChatRoomInput | UserChatUpsertWithWhereUniqueWithoutChatRoomInput[]
    createMany?: UserChatCreateManyChatRoomInputEnvelope
    set?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    disconnect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    delete?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    update?: UserChatUpdateWithWhereUniqueWithoutChatRoomInput | UserChatUpdateWithWhereUniqueWithoutChatRoomInput[]
    updateMany?: UserChatUpdateManyWithWhereWithoutChatRoomInput | UserChatUpdateManyWithWhereWithoutChatRoomInput[]
    deleteMany?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
  }

  export type MessageUncheckedUpdateManyWithoutChatNestedInput = {
    create?: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput> | MessageCreateWithoutChatInput[] | MessageUncheckedCreateWithoutChatInput[]
    connectOrCreate?: MessageCreateOrConnectWithoutChatInput | MessageCreateOrConnectWithoutChatInput[]
    upsert?: MessageUpsertWithWhereUniqueWithoutChatInput | MessageUpsertWithWhereUniqueWithoutChatInput[]
    createMany?: MessageCreateManyChatInputEnvelope
    set?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    disconnect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    delete?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    connect?: MessageWhereUniqueInput | MessageWhereUniqueInput[]
    update?: MessageUpdateWithWhereUniqueWithoutChatInput | MessageUpdateWithWhereUniqueWithoutChatInput[]
    updateMany?: MessageUpdateManyWithWhereWithoutChatInput | MessageUpdateManyWithWhereWithoutChatInput[]
    deleteMany?: MessageScalarWhereInput | MessageScalarWhereInput[]
  }

  export type UserChatUncheckedUpdateManyWithoutChatRoomNestedInput = {
    create?: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput> | UserChatCreateWithoutChatRoomInput[] | UserChatUncheckedCreateWithoutChatRoomInput[]
    connectOrCreate?: UserChatCreateOrConnectWithoutChatRoomInput | UserChatCreateOrConnectWithoutChatRoomInput[]
    upsert?: UserChatUpsertWithWhereUniqueWithoutChatRoomInput | UserChatUpsertWithWhereUniqueWithoutChatRoomInput[]
    createMany?: UserChatCreateManyChatRoomInputEnvelope
    set?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    disconnect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    delete?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    connect?: UserChatWhereUniqueInput | UserChatWhereUniqueInput[]
    update?: UserChatUpdateWithWhereUniqueWithoutChatRoomInput | UserChatUpdateWithWhereUniqueWithoutChatRoomInput[]
    updateMany?: UserChatUpdateManyWithWhereWithoutChatRoomInput | UserChatUpdateManyWithWhereWithoutChatRoomInput[]
    deleteMany?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
  }

  export type GeneralUserCreateNestedOneWithoutUserChatInput = {
    create?: XOR<GeneralUserCreateWithoutUserChatInput, GeneralUserUncheckedCreateWithoutUserChatInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutUserChatInput
    connect?: GeneralUserWhereUniqueInput
  }

  export type ChatRoomCreateNestedOneWithoutUserChatsInput = {
    create?: XOR<ChatRoomCreateWithoutUserChatsInput, ChatRoomUncheckedCreateWithoutUserChatsInput>
    connectOrCreate?: ChatRoomCreateOrConnectWithoutUserChatsInput
    connect?: ChatRoomWhereUniqueInput
  }

  export type GeneralUserUpdateOneRequiredWithoutUserChatNestedInput = {
    create?: XOR<GeneralUserCreateWithoutUserChatInput, GeneralUserUncheckedCreateWithoutUserChatInput>
    connectOrCreate?: GeneralUserCreateOrConnectWithoutUserChatInput
    upsert?: GeneralUserUpsertWithoutUserChatInput
    connect?: GeneralUserWhereUniqueInput
    update?: XOR<XOR<GeneralUserUpdateToOneWithWhereWithoutUserChatInput, GeneralUserUpdateWithoutUserChatInput>, GeneralUserUncheckedUpdateWithoutUserChatInput>
  }

  export type ChatRoomUpdateOneRequiredWithoutUserChatsNestedInput = {
    create?: XOR<ChatRoomCreateWithoutUserChatsInput, ChatRoomUncheckedCreateWithoutUserChatsInput>
    connectOrCreate?: ChatRoomCreateOrConnectWithoutUserChatsInput
    upsert?: ChatRoomUpsertWithoutUserChatsInput
    connect?: ChatRoomWhereUniqueInput
    update?: XOR<XOR<ChatRoomUpdateToOneWithWhereWithoutUserChatsInput, ChatRoomUpdateWithoutUserChatsInput>, ChatRoomUncheckedUpdateWithoutUserChatsInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumChatTypeFilter<$PrismaModel = never> = {
    equals?: $Enums.ChatType | EnumChatTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChatTypeFilter<$PrismaModel> | $Enums.ChatType
  }

  export type NestedEnumChatTypeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.ChatType | EnumChatTypeFieldRefInput<$PrismaModel>
    in?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    notIn?: $Enums.ChatType[] | ListEnumChatTypeFieldRefInput<$PrismaModel>
    not?: NestedEnumChatTypeWithAggregatesFilter<$PrismaModel> | $Enums.ChatType
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumChatTypeFilter<$PrismaModel>
    _max?: NestedEnumChatTypeFilter<$PrismaModel>
  }

  export type CorporateUserCreateWithoutOrganizationInput = {
    uuid: string
    name?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CorporateUserUncheckedCreateWithoutOrganizationInput = {
    id?: number
    uuid: string
    name?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CorporateUserCreateOrConnectWithoutOrganizationInput = {
    where: CorporateUserWhereUniqueInput
    create: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput>
  }

  export type CorporateUserCreateManyOrganizationInputEnvelope = {
    data: CorporateUserCreateManyOrganizationInput | CorporateUserCreateManyOrganizationInput[]
    skipDuplicates?: boolean
  }

  export type CorporateUserUpsertWithWhereUniqueWithoutOrganizationInput = {
    where: CorporateUserWhereUniqueInput
    update: XOR<CorporateUserUpdateWithoutOrganizationInput, CorporateUserUncheckedUpdateWithoutOrganizationInput>
    create: XOR<CorporateUserCreateWithoutOrganizationInput, CorporateUserUncheckedCreateWithoutOrganizationInput>
  }

  export type CorporateUserUpdateWithWhereUniqueWithoutOrganizationInput = {
    where: CorporateUserWhereUniqueInput
    data: XOR<CorporateUserUpdateWithoutOrganizationInput, CorporateUserUncheckedUpdateWithoutOrganizationInput>
  }

  export type CorporateUserUpdateManyWithWhereWithoutOrganizationInput = {
    where: CorporateUserScalarWhereInput
    data: XOR<CorporateUserUpdateManyMutationInput, CorporateUserUncheckedUpdateManyWithoutOrganizationInput>
  }

  export type CorporateUserScalarWhereInput = {
    AND?: CorporateUserScalarWhereInput | CorporateUserScalarWhereInput[]
    OR?: CorporateUserScalarWhereInput[]
    NOT?: CorporateUserScalarWhereInput | CorporateUserScalarWhereInput[]
    id?: IntFilter<"CorporateUser"> | number
    uuid?: UuidFilter<"CorporateUser"> | string
    name?: StringFilter<"CorporateUser"> | string
    organizationId?: IntFilter<"CorporateUser"> | number
    createdAt?: DateTimeFilter<"CorporateUser"> | Date | string
    updatedAt?: DateTimeFilter<"CorporateUser"> | Date | string
  }

  export type OrganizationCreateWithoutUsersInput = {
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationUncheckedCreateWithoutUsersInput = {
    id?: number
    name: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type OrganizationCreateOrConnectWithoutUsersInput = {
    where: OrganizationWhereUniqueInput
    create: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
  }

  export type OrganizationUpsertWithoutUsersInput = {
    update: XOR<OrganizationUpdateWithoutUsersInput, OrganizationUncheckedUpdateWithoutUsersInput>
    create: XOR<OrganizationCreateWithoutUsersInput, OrganizationUncheckedCreateWithoutUsersInput>
    where?: OrganizationWhereInput
  }

  export type OrganizationUpdateToOneWithWhereWithoutUsersInput = {
    where?: OrganizationWhereInput
    data: XOR<OrganizationUpdateWithoutUsersInput, OrganizationUncheckedUpdateWithoutUsersInput>
  }

  export type OrganizationUpdateWithoutUsersInput = {
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type OrganizationUncheckedUpdateWithoutUsersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type GeneralUserProfileCreateWithoutGeneralUserInput = {
    firstName?: string
    lastName?: string
    email: string
    phoneNumber?: string | null
    address?: AddressCreateNestedOneWithoutGeneralUserProfileInput
  }

  export type GeneralUserProfileUncheckedCreateWithoutGeneralUserInput = {
    id?: number
    firstName?: string
    lastName?: string
    email: string
    phoneNumber?: string | null
    address?: AddressUncheckedCreateNestedOneWithoutGeneralUserProfileInput
  }

  export type GeneralUserProfileCreateOrConnectWithoutGeneralUserInput = {
    where: GeneralUserProfileWhereUniqueInput
    create: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
  }

  export type MessageCreateWithoutSenderInput = {
    content: string
    createdAt?: Date | string
    chat: ChatRoomCreateNestedOneWithoutMessagesInput
  }

  export type MessageUncheckedCreateWithoutSenderInput = {
    id?: number
    chatRoomId: number
    content: string
    createdAt?: Date | string
  }

  export type MessageCreateOrConnectWithoutSenderInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput>
  }

  export type MessageCreateManySenderInputEnvelope = {
    data: MessageCreateManySenderInput | MessageCreateManySenderInput[]
    skipDuplicates?: boolean
  }

  export type UserChatCreateWithoutUserInput = {
    chatRoom: ChatRoomCreateNestedOneWithoutUserChatsInput
  }

  export type UserChatUncheckedCreateWithoutUserInput = {
    id?: number
    chatRoomId: number
  }

  export type UserChatCreateOrConnectWithoutUserInput = {
    where: UserChatWhereUniqueInput
    create: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput>
  }

  export type UserChatCreateManyUserInputEnvelope = {
    data: UserChatCreateManyUserInput | UserChatCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type GeneralUserProfileUpsertWithoutGeneralUserInput = {
    update: XOR<GeneralUserProfileUpdateWithoutGeneralUserInput, GeneralUserProfileUncheckedUpdateWithoutGeneralUserInput>
    create: XOR<GeneralUserProfileCreateWithoutGeneralUserInput, GeneralUserProfileUncheckedCreateWithoutGeneralUserInput>
    where?: GeneralUserProfileWhereInput
  }

  export type GeneralUserProfileUpdateToOneWithWhereWithoutGeneralUserInput = {
    where?: GeneralUserProfileWhereInput
    data: XOR<GeneralUserProfileUpdateWithoutGeneralUserInput, GeneralUserProfileUncheckedUpdateWithoutGeneralUserInput>
  }

  export type GeneralUserProfileUpdateWithoutGeneralUserInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    address?: AddressUpdateOneWithoutGeneralUserProfileNestedInput
  }

  export type GeneralUserProfileUncheckedUpdateWithoutGeneralUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    address?: AddressUncheckedUpdateOneWithoutGeneralUserProfileNestedInput
  }

  export type MessageUpsertWithWhereUniqueWithoutSenderInput = {
    where: MessageWhereUniqueInput
    update: XOR<MessageUpdateWithoutSenderInput, MessageUncheckedUpdateWithoutSenderInput>
    create: XOR<MessageCreateWithoutSenderInput, MessageUncheckedCreateWithoutSenderInput>
  }

  export type MessageUpdateWithWhereUniqueWithoutSenderInput = {
    where: MessageWhereUniqueInput
    data: XOR<MessageUpdateWithoutSenderInput, MessageUncheckedUpdateWithoutSenderInput>
  }

  export type MessageUpdateManyWithWhereWithoutSenderInput = {
    where: MessageScalarWhereInput
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyWithoutSenderInput>
  }

  export type MessageScalarWhereInput = {
    AND?: MessageScalarWhereInput | MessageScalarWhereInput[]
    OR?: MessageScalarWhereInput[]
    NOT?: MessageScalarWhereInput | MessageScalarWhereInput[]
    id?: IntFilter<"Message"> | number
    chatRoomId?: IntFilter<"Message"> | number
    senderId?: IntFilter<"Message"> | number
    content?: StringFilter<"Message"> | string
    createdAt?: DateTimeFilter<"Message"> | Date | string
  }

  export type UserChatUpsertWithWhereUniqueWithoutUserInput = {
    where: UserChatWhereUniqueInput
    update: XOR<UserChatUpdateWithoutUserInput, UserChatUncheckedUpdateWithoutUserInput>
    create: XOR<UserChatCreateWithoutUserInput, UserChatUncheckedCreateWithoutUserInput>
  }

  export type UserChatUpdateWithWhereUniqueWithoutUserInput = {
    where: UserChatWhereUniqueInput
    data: XOR<UserChatUpdateWithoutUserInput, UserChatUncheckedUpdateWithoutUserInput>
  }

  export type UserChatUpdateManyWithWhereWithoutUserInput = {
    where: UserChatScalarWhereInput
    data: XOR<UserChatUpdateManyMutationInput, UserChatUncheckedUpdateManyWithoutUserInput>
  }

  export type UserChatScalarWhereInput = {
    AND?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
    OR?: UserChatScalarWhereInput[]
    NOT?: UserChatScalarWhereInput | UserChatScalarWhereInput[]
    id?: IntFilter<"UserChat"> | number
    userId?: IntFilter<"UserChat"> | number
    chatRoomId?: IntFilter<"UserChat"> | number
  }

  export type AddressCreateWithoutGeneralUserProfileInput = {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }

  export type AddressUncheckedCreateWithoutGeneralUserProfileInput = {
    id?: number
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }

  export type AddressCreateOrConnectWithoutGeneralUserProfileInput = {
    where: AddressWhereUniqueInput
    create: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
  }

  export type GeneralUserCreateWithoutProfileInput = {
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    Message?: MessageCreateNestedManyWithoutSenderInput
    UserChat?: UserChatCreateNestedManyWithoutUserInput
  }

  export type GeneralUserUncheckedCreateWithoutProfileInput = {
    id?: number
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    Message?: MessageUncheckedCreateNestedManyWithoutSenderInput
    UserChat?: UserChatUncheckedCreateNestedManyWithoutUserInput
  }

  export type GeneralUserCreateOrConnectWithoutProfileInput = {
    where: GeneralUserWhereUniqueInput
    create: XOR<GeneralUserCreateWithoutProfileInput, GeneralUserUncheckedCreateWithoutProfileInput>
  }

  export type AddressUpsertWithoutGeneralUserProfileInput = {
    update: XOR<AddressUpdateWithoutGeneralUserProfileInput, AddressUncheckedUpdateWithoutGeneralUserProfileInput>
    create: XOR<AddressCreateWithoutGeneralUserProfileInput, AddressUncheckedCreateWithoutGeneralUserProfileInput>
    where?: AddressWhereInput
  }

  export type AddressUpdateToOneWithWhereWithoutGeneralUserProfileInput = {
    where?: AddressWhereInput
    data: XOR<AddressUpdateWithoutGeneralUserProfileInput, AddressUncheckedUpdateWithoutGeneralUserProfileInput>
  }

  export type AddressUpdateWithoutGeneralUserProfileInput = {
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
  }

  export type AddressUncheckedUpdateWithoutGeneralUserProfileInput = {
    id?: IntFieldUpdateOperationsInput | number
    street?: StringFieldUpdateOperationsInput | string
    city?: StringFieldUpdateOperationsInput | string
    state?: StringFieldUpdateOperationsInput | string
    postalCode?: StringFieldUpdateOperationsInput | string
    country?: StringFieldUpdateOperationsInput | string
  }

  export type GeneralUserUpsertWithoutProfileInput = {
    update: XOR<GeneralUserUpdateWithoutProfileInput, GeneralUserUncheckedUpdateWithoutProfileInput>
    create: XOR<GeneralUserCreateWithoutProfileInput, GeneralUserUncheckedCreateWithoutProfileInput>
    where?: GeneralUserWhereInput
  }

  export type GeneralUserUpdateToOneWithWhereWithoutProfileInput = {
    where?: GeneralUserWhereInput
    data: XOR<GeneralUserUpdateWithoutProfileInput, GeneralUserUncheckedUpdateWithoutProfileInput>
  }

  export type GeneralUserUpdateWithoutProfileInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Message?: MessageUpdateManyWithoutSenderNestedInput
    UserChat?: UserChatUpdateManyWithoutUserNestedInput
  }

  export type GeneralUserUncheckedUpdateWithoutProfileInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Message?: MessageUncheckedUpdateManyWithoutSenderNestedInput
    UserChat?: UserChatUncheckedUpdateManyWithoutUserNestedInput
  }

  export type GeneralUserProfileCreateWithoutAddressInput = {
    firstName?: string
    lastName?: string
    email: string
    phoneNumber?: string | null
    generalUser: GeneralUserCreateNestedOneWithoutProfileInput
  }

  export type GeneralUserProfileUncheckedCreateWithoutAddressInput = {
    id?: number
    firstName?: string
    lastName?: string
    userId: number
    email: string
    phoneNumber?: string | null
  }

  export type GeneralUserProfileCreateOrConnectWithoutAddressInput = {
    where: GeneralUserProfileWhereUniqueInput
    create: XOR<GeneralUserProfileCreateWithoutAddressInput, GeneralUserProfileUncheckedCreateWithoutAddressInput>
  }

  export type GeneralUserProfileUpsertWithoutAddressInput = {
    update: XOR<GeneralUserProfileUpdateWithoutAddressInput, GeneralUserProfileUncheckedUpdateWithoutAddressInput>
    create: XOR<GeneralUserProfileCreateWithoutAddressInput, GeneralUserProfileUncheckedCreateWithoutAddressInput>
    where?: GeneralUserProfileWhereInput
  }

  export type GeneralUserProfileUpdateToOneWithWhereWithoutAddressInput = {
    where?: GeneralUserProfileWhereInput
    data: XOR<GeneralUserProfileUpdateWithoutAddressInput, GeneralUserProfileUncheckedUpdateWithoutAddressInput>
  }

  export type GeneralUserProfileUpdateWithoutAddressInput = {
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
    generalUser?: GeneralUserUpdateOneRequiredWithoutProfileNestedInput
  }

  export type GeneralUserProfileUncheckedUpdateWithoutAddressInput = {
    id?: IntFieldUpdateOperationsInput | number
    firstName?: StringFieldUpdateOperationsInput | string
    lastName?: StringFieldUpdateOperationsInput | string
    userId?: IntFieldUpdateOperationsInput | number
    email?: StringFieldUpdateOperationsInput | string
    phoneNumber?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type ChatRoomCreateWithoutMessagesInput = {
    type: $Enums.ChatType
    createdAt?: Date | string
    userChats?: UserChatCreateNestedManyWithoutChatRoomInput
  }

  export type ChatRoomUncheckedCreateWithoutMessagesInput = {
    id?: number
    type: $Enums.ChatType
    createdAt?: Date | string
    userChats?: UserChatUncheckedCreateNestedManyWithoutChatRoomInput
  }

  export type ChatRoomCreateOrConnectWithoutMessagesInput = {
    where: ChatRoomWhereUniqueInput
    create: XOR<ChatRoomCreateWithoutMessagesInput, ChatRoomUncheckedCreateWithoutMessagesInput>
  }

  export type GeneralUserCreateWithoutMessageInput = {
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileCreateNestedOneWithoutGeneralUserInput
    UserChat?: UserChatCreateNestedManyWithoutUserInput
  }

  export type GeneralUserUncheckedCreateWithoutMessageInput = {
    id?: number
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileUncheckedCreateNestedOneWithoutGeneralUserInput
    UserChat?: UserChatUncheckedCreateNestedManyWithoutUserInput
  }

  export type GeneralUserCreateOrConnectWithoutMessageInput = {
    where: GeneralUserWhereUniqueInput
    create: XOR<GeneralUserCreateWithoutMessageInput, GeneralUserUncheckedCreateWithoutMessageInput>
  }

  export type ChatRoomUpsertWithoutMessagesInput = {
    update: XOR<ChatRoomUpdateWithoutMessagesInput, ChatRoomUncheckedUpdateWithoutMessagesInput>
    create: XOR<ChatRoomCreateWithoutMessagesInput, ChatRoomUncheckedCreateWithoutMessagesInput>
    where?: ChatRoomWhereInput
  }

  export type ChatRoomUpdateToOneWithWhereWithoutMessagesInput = {
    where?: ChatRoomWhereInput
    data: XOR<ChatRoomUpdateWithoutMessagesInput, ChatRoomUncheckedUpdateWithoutMessagesInput>
  }

  export type ChatRoomUpdateWithoutMessagesInput = {
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userChats?: UserChatUpdateManyWithoutChatRoomNestedInput
  }

  export type ChatRoomUncheckedUpdateWithoutMessagesInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    userChats?: UserChatUncheckedUpdateManyWithoutChatRoomNestedInput
  }

  export type GeneralUserUpsertWithoutMessageInput = {
    update: XOR<GeneralUserUpdateWithoutMessageInput, GeneralUserUncheckedUpdateWithoutMessageInput>
    create: XOR<GeneralUserCreateWithoutMessageInput, GeneralUserUncheckedCreateWithoutMessageInput>
    where?: GeneralUserWhereInput
  }

  export type GeneralUserUpdateToOneWithWhereWithoutMessageInput = {
    where?: GeneralUserWhereInput
    data: XOR<GeneralUserUpdateWithoutMessageInput, GeneralUserUncheckedUpdateWithoutMessageInput>
  }

  export type GeneralUserUpdateWithoutMessageInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUpdateOneWithoutGeneralUserNestedInput
    UserChat?: UserChatUpdateManyWithoutUserNestedInput
  }

  export type GeneralUserUncheckedUpdateWithoutMessageInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUncheckedUpdateOneWithoutGeneralUserNestedInput
    UserChat?: UserChatUncheckedUpdateManyWithoutUserNestedInput
  }

  export type MessageCreateWithoutChatInput = {
    content: string
    createdAt?: Date | string
    sender: GeneralUserCreateNestedOneWithoutMessageInput
  }

  export type MessageUncheckedCreateWithoutChatInput = {
    id?: number
    senderId: number
    content: string
    createdAt?: Date | string
  }

  export type MessageCreateOrConnectWithoutChatInput = {
    where: MessageWhereUniqueInput
    create: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput>
  }

  export type MessageCreateManyChatInputEnvelope = {
    data: MessageCreateManyChatInput | MessageCreateManyChatInput[]
    skipDuplicates?: boolean
  }

  export type UserChatCreateWithoutChatRoomInput = {
    user: GeneralUserCreateNestedOneWithoutUserChatInput
  }

  export type UserChatUncheckedCreateWithoutChatRoomInput = {
    id?: number
    userId: number
  }

  export type UserChatCreateOrConnectWithoutChatRoomInput = {
    where: UserChatWhereUniqueInput
    create: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput>
  }

  export type UserChatCreateManyChatRoomInputEnvelope = {
    data: UserChatCreateManyChatRoomInput | UserChatCreateManyChatRoomInput[]
    skipDuplicates?: boolean
  }

  export type MessageUpsertWithWhereUniqueWithoutChatInput = {
    where: MessageWhereUniqueInput
    update: XOR<MessageUpdateWithoutChatInput, MessageUncheckedUpdateWithoutChatInput>
    create: XOR<MessageCreateWithoutChatInput, MessageUncheckedCreateWithoutChatInput>
  }

  export type MessageUpdateWithWhereUniqueWithoutChatInput = {
    where: MessageWhereUniqueInput
    data: XOR<MessageUpdateWithoutChatInput, MessageUncheckedUpdateWithoutChatInput>
  }

  export type MessageUpdateManyWithWhereWithoutChatInput = {
    where: MessageScalarWhereInput
    data: XOR<MessageUpdateManyMutationInput, MessageUncheckedUpdateManyWithoutChatInput>
  }

  export type UserChatUpsertWithWhereUniqueWithoutChatRoomInput = {
    where: UserChatWhereUniqueInput
    update: XOR<UserChatUpdateWithoutChatRoomInput, UserChatUncheckedUpdateWithoutChatRoomInput>
    create: XOR<UserChatCreateWithoutChatRoomInput, UserChatUncheckedCreateWithoutChatRoomInput>
  }

  export type UserChatUpdateWithWhereUniqueWithoutChatRoomInput = {
    where: UserChatWhereUniqueInput
    data: XOR<UserChatUpdateWithoutChatRoomInput, UserChatUncheckedUpdateWithoutChatRoomInput>
  }

  export type UserChatUpdateManyWithWhereWithoutChatRoomInput = {
    where: UserChatScalarWhereInput
    data: XOR<UserChatUpdateManyMutationInput, UserChatUncheckedUpdateManyWithoutChatRoomInput>
  }

  export type GeneralUserCreateWithoutUserChatInput = {
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileCreateNestedOneWithoutGeneralUserInput
    Message?: MessageCreateNestedManyWithoutSenderInput
  }

  export type GeneralUserUncheckedCreateWithoutUserChatInput = {
    id?: number
    uuid: string
    displayName?: string
    accountName: string
    createdAt?: Date | string
    updatedAt?: Date | string
    profile?: GeneralUserProfileUncheckedCreateNestedOneWithoutGeneralUserInput
    Message?: MessageUncheckedCreateNestedManyWithoutSenderInput
  }

  export type GeneralUserCreateOrConnectWithoutUserChatInput = {
    where: GeneralUserWhereUniqueInput
    create: XOR<GeneralUserCreateWithoutUserChatInput, GeneralUserUncheckedCreateWithoutUserChatInput>
  }

  export type ChatRoomCreateWithoutUserChatsInput = {
    type: $Enums.ChatType
    createdAt?: Date | string
    messages?: MessageCreateNestedManyWithoutChatInput
  }

  export type ChatRoomUncheckedCreateWithoutUserChatsInput = {
    id?: number
    type: $Enums.ChatType
    createdAt?: Date | string
    messages?: MessageUncheckedCreateNestedManyWithoutChatInput
  }

  export type ChatRoomCreateOrConnectWithoutUserChatsInput = {
    where: ChatRoomWhereUniqueInput
    create: XOR<ChatRoomCreateWithoutUserChatsInput, ChatRoomUncheckedCreateWithoutUserChatsInput>
  }

  export type GeneralUserUpsertWithoutUserChatInput = {
    update: XOR<GeneralUserUpdateWithoutUserChatInput, GeneralUserUncheckedUpdateWithoutUserChatInput>
    create: XOR<GeneralUserCreateWithoutUserChatInput, GeneralUserUncheckedCreateWithoutUserChatInput>
    where?: GeneralUserWhereInput
  }

  export type GeneralUserUpdateToOneWithWhereWithoutUserChatInput = {
    where?: GeneralUserWhereInput
    data: XOR<GeneralUserUpdateWithoutUserChatInput, GeneralUserUncheckedUpdateWithoutUserChatInput>
  }

  export type GeneralUserUpdateWithoutUserChatInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUpdateOneWithoutGeneralUserNestedInput
    Message?: MessageUpdateManyWithoutSenderNestedInput
  }

  export type GeneralUserUncheckedUpdateWithoutUserChatInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    displayName?: StringFieldUpdateOperationsInput | string
    accountName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    profile?: GeneralUserProfileUncheckedUpdateOneWithoutGeneralUserNestedInput
    Message?: MessageUncheckedUpdateManyWithoutSenderNestedInput
  }

  export type ChatRoomUpsertWithoutUserChatsInput = {
    update: XOR<ChatRoomUpdateWithoutUserChatsInput, ChatRoomUncheckedUpdateWithoutUserChatsInput>
    create: XOR<ChatRoomCreateWithoutUserChatsInput, ChatRoomUncheckedCreateWithoutUserChatsInput>
    where?: ChatRoomWhereInput
  }

  export type ChatRoomUpdateToOneWithWhereWithoutUserChatsInput = {
    where?: ChatRoomWhereInput
    data: XOR<ChatRoomUpdateWithoutUserChatsInput, ChatRoomUncheckedUpdateWithoutUserChatsInput>
  }

  export type ChatRoomUpdateWithoutUserChatsInput = {
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: MessageUpdateManyWithoutChatNestedInput
  }

  export type ChatRoomUncheckedUpdateWithoutUserChatsInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: EnumChatTypeFieldUpdateOperationsInput | $Enums.ChatType
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    messages?: MessageUncheckedUpdateManyWithoutChatNestedInput
  }

  export type CorporateUserCreateManyOrganizationInput = {
    id?: number
    uuid: string
    name?: string
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CorporateUserUpdateWithoutOrganizationInput = {
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CorporateUserUncheckedUpdateWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CorporateUserUncheckedUpdateManyWithoutOrganizationInput = {
    id?: IntFieldUpdateOperationsInput | number
    uuid?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageCreateManySenderInput = {
    id?: number
    chatRoomId: number
    content: string
    createdAt?: Date | string
  }

  export type UserChatCreateManyUserInput = {
    id?: number
    chatRoomId: number
  }

  export type MessageUpdateWithoutSenderInput = {
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chat?: ChatRoomUpdateOneRequiredWithoutMessagesNestedInput
  }

  export type MessageUncheckedUpdateWithoutSenderInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageUncheckedUpdateManyWithoutSenderInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserChatUpdateWithoutUserInput = {
    chatRoom?: ChatRoomUpdateOneRequiredWithoutUserChatsNestedInput
  }

  export type UserChatUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
  }

  export type UserChatUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    chatRoomId?: IntFieldUpdateOperationsInput | number
  }

  export type MessageCreateManyChatInput = {
    id?: number
    senderId: number
    content: string
    createdAt?: Date | string
  }

  export type UserChatCreateManyChatRoomInput = {
    id?: number
    userId: number
  }

  export type MessageUpdateWithoutChatInput = {
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    sender?: GeneralUserUpdateOneRequiredWithoutMessageNestedInput
  }

  export type MessageUncheckedUpdateWithoutChatInput = {
    id?: IntFieldUpdateOperationsInput | number
    senderId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type MessageUncheckedUpdateManyWithoutChatInput = {
    id?: IntFieldUpdateOperationsInput | number
    senderId?: IntFieldUpdateOperationsInput | number
    content?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserChatUpdateWithoutChatRoomInput = {
    user?: GeneralUserUpdateOneRequiredWithoutUserChatNestedInput
  }

  export type UserChatUncheckedUpdateWithoutChatRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
  }

  export type UserChatUncheckedUpdateManyWithoutChatRoomInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use OrganizationCountOutputTypeDefaultArgs instead
     */
    export type OrganizationCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrganizationCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use GeneralUserCountOutputTypeDefaultArgs instead
     */
    export type GeneralUserCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = GeneralUserCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ChatRoomCountOutputTypeDefaultArgs instead
     */
    export type ChatRoomCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatRoomCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use OrganizationDefaultArgs instead
     */
    export type OrganizationArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = OrganizationDefaultArgs<ExtArgs>
    /**
     * @deprecated Use CorporateUserDefaultArgs instead
     */
    export type CorporateUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = CorporateUserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use GeneralUserDefaultArgs instead
     */
    export type GeneralUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = GeneralUserDefaultArgs<ExtArgs>
    /**
     * @deprecated Use GeneralUserProfileDefaultArgs instead
     */
    export type GeneralUserProfileArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = GeneralUserProfileDefaultArgs<ExtArgs>
    /**
     * @deprecated Use AddressDefaultArgs instead
     */
    export type AddressArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = AddressDefaultArgs<ExtArgs>
    /**
     * @deprecated Use MessageDefaultArgs instead
     */
    export type MessageArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = MessageDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ChatRoomDefaultArgs instead
     */
    export type ChatRoomArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ChatRoomDefaultArgs<ExtArgs>
    /**
     * @deprecated Use UserChatDefaultArgs instead
     */
    export type UserChatArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = UserChatDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}