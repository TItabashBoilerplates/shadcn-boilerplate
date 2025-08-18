# Prisma Initial Setup

Prisma is an ORM tool that simplifies interactions with your database. This guide will cover how to edit the Prisma schema file and the corresponding seed file.

## Editing the Schema File

The Prisma schema file is located at `prisma/schema.prisma`. This file is where you define the structure of your database tables.

For example, you can define a user table as follows:

``` scheme.prisma
model User {
    id    Int     @id @default(autoincrement())
    name  String
    email String  @unique
    posts Post[]
}

model Post {
    id        Int      @id @default(autoincrement())
    title     String
    content   String?
    published Boolean  @default(false)
    author    User     @relation(fields: [authorId], references: [id])
    authorId  Int
}
```

In the example above, we have defined two tables, `User` and `Post`. The User table has fields `id`, `name`, `email`, and the Post table has fields `id`, `title`, `content`, `published`, `author`, `authorId`.

## Editing the Seed File

The seed file is used to populate your database with initial data. In Prisma, you can define this initial data by editing the prisma/seed.ts file.

Here's an example of a seed file:

``` seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const newUser = await prisma.user.create({
        data: {
            name: "Alice",
            email: "alice@example.com",
            posts: {
                create: {
                    title: "Hello World",
                    content: "Welcome to Prisma",
                    published: true,
                },
            },
        },
    });

    console.log("Created new user: ", newUser);
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
```

In the example above, we're creating a new user and a post for that user.
