import { PrismaClient } from '@prisma/client';
import { exercises } from './exercises';

const prisma = new PrismaClient();

async function main() {
  // Crear usuarios
  const users = [
    {
      name: 'Vanessa',
      img: '/images/avatars/vanessa.png',
    },
    {
      name: 'Santiago',
      img: '/images/avatars/santiago.png',
    },
  ];

  console.log('Creando usuarios...');
  
  for (const user of users) {
    await prisma.user.upsert({
      where: { name: user.name },
      update: {},
      create: user,
    });
  }

  console.log('Usuarios creados correctamente');

  // Crear ejercicios base
  console.log('Creando catálogo de ejercicios...');
  
  for (const exercise of exercises) {
    await prisma.exercise.upsert({
      where: { 
        id: exercise.id || '' 
      },
      update: {},
      create: {
        name: exercise.name,
        category: exercise.category,
      },
    });
  }

  console.log('Catálogo de ejercicios creado correctamente');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
