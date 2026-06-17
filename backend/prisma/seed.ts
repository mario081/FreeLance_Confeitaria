import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const senhaConfeiteira = process.env.SEED_PASSWORD_CONFEITEIRA ?? 'confeitaria123';
  const senhaFuncionaria = process.env.SEED_PASSWORD_FUNCIONARIA ?? 'funcionaria123';

  await prisma.user.upsert({
    where: { username: 'confeiteira' },
    update: {},
    create: {
      username: 'confeiteira',
      password: await bcrypt.hash(senhaConfeiteira, 10),
      role: 'confeiteira',
    },
  });

  await prisma.user.upsert({
    where: { username: 'funcionaria' },
    update: {},
    create: {
      username: 'funcionaria',
      password: await bcrypt.hash(senhaFuncionaria, 10),
      role: 'funcionaria',
    },
  });

  console.log('Usuários criados: confeiteira / funcionaria');
}

main().catch(console.error).finally(() => prisma.$disconnect());
