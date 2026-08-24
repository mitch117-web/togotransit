import prisma from './src/lib/prisma';

async function main() {
  const utilisateurs = await prisma.utilisateur.findMany();
  console.log('Utilisateurs in DB:', utilisateurs);

  const compagnies = await prisma.compagnie.findMany();
  console.log('Compagnies in DB:', compagnies);

  const parcels = await prisma.parcel.findMany();
  console.log('Parcels in DB:', parcels);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());