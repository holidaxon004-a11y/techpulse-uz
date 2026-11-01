import { DatabaseService } from '../src/prisma/database.service';

async function main() {
  const db = new DatabaseService();
  await db.init();
  await db.onModuleDestroy();
  console.log('✅ Database seed verified.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

