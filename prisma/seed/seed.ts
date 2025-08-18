// import { PrismaClient } from "./generated";
// import { categories } from "./data/categories";

// const prisma = new PrismaClient();

async function main() {
  // カテゴリーデータの作成
  // for (const category of categories) {
  //   await prisma.category.create({ data: category });
  // }
  // その他のデータ投入処理...
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // await prisma.$disconnect();
  });
