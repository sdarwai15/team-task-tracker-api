import { prisma } from '../../src/config/db';

/**
 * Creates a clean test org + admin user for each test suite.
 * Uses a unique slug per run to avoid conflicts.
 */
export const createTestOrg = async (slug: string) => {
  return prisma.organization.create({
    data: {
      name: `Test Org ${slug}`,
      slug,
    },
  });
};

export const cleanupTestData = async (orgId: string) => {
  // Delete in dependency order
  await prisma.refreshToken.deleteMany({ where: { user: { orgId } } });
  await prisma.task.deleteMany({ where: { orgId } });
  await prisma.project.deleteMany({ where: { orgId } });
  await prisma.user.deleteMany({ where: { orgId } });
  await prisma.organization.delete({ where: { id: orgId } });
};
