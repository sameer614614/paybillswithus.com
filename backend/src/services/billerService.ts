import prisma from '../utils/prisma.js';

export async function listBillers(userId: string) {
  return prisma.biller.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      receipts: {
        orderBy: { paidOn: 'desc' },
        take: 3,
      },
    },
  });
}
