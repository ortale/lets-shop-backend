import 'dotenv/config';
import http from 'http';
import app from './app';
import { setupSocket } from './config/socket';
import { prisma } from './config/prisma';

const PORT = process.env.PORT || 3000;

const httpServer = http.createServer(app);
const io = setupSocket(httpServer);

// Make io accessible inside controllers via req.app.get('io')
app.set('io', io);

async function main() {
	try {
		await prisma.$connect();
		console.log('✅ Database connected');

		httpServer.listen(PORT, () => {
			console.log(`🚀 Server running on http://localhost:${PORT}`);
			console.log(`🔌 Socket.io ready`);
		});
	} catch (err) {
		console.error('❌ Failed to start server:', err);
		process.exit(1);
	}
}

main();

// Graceful shutdown
process.on('SIGTERM', async () => {
	await prisma.$disconnect();
	process.exit(0);
});
