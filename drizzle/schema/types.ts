import { pgEnum } from 'drizzle-orm/pg-core'

// Enum: chat_type
export const chatTypeEnum = pgEnum('chat_type', ['PRIVATE', 'GROUP'])
