import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const senhaConfeiteira = process.env.SEED_PASSWORD_CONFEITEIRA;
  const senhaFuncionaria = process.env.SEED_PASSWORD_FUNCIONARIA;

  if (!senhaConfeiteira || !senhaFuncionaria) {
    throw new Error(
      'Defina SEED_PASSWORD_CONFEITEIRA e SEED_PASSWORD_FUNCIONARIA no .env antes de executar o seed.',
    );
  }

  await prisma.user.upsert({
    where: { username: 'confeiteira' },
    update: { password: await bcrypt.hash(senhaConfeiteira, 10) },
    create: {
      username: 'confeiteira',
      password: await bcrypt.hash(senhaConfeiteira, 10),
      role: 'confeiteira',
    },
  });

  await prisma.user.upsert({
    where: { username: 'funcionaria' },
    update: { password: await bcrypt.hash(senhaFuncionaria, 10) },
    create: {
      username: 'funcionaria',
      password: await bcrypt.hash(senhaFuncionaria, 10),
      role: 'funcionaria',
    },
  });

  console.log('Usuários criados: confeiteira / funcionaria');
}

main().catch(console.error).finally(() => prisma.$disconnect());
