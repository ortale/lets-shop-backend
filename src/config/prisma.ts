// PrismaClient is generated after running `npm run db:generate`
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PrismaClientClass: any;
try {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	PrismaClientClass = require('@prisma/client').PrismaClient;
} catch {
	console.warn('Prisma client not generated yet. Run: npm run db:generate');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalForPrisma = globalThis as unknown as { prisma: any };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma: any =
	globalForPrisma.prisma ??
	(PrismaClientClass
		? new PrismaClientClass({
			log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
		})
		: null);

if (process.env.NODE_ENV !== 'production') {
	globalForPrisma.prisma = prisma;
}
