import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types';

interface SocketWithUser {
	userId: string;
	userName: string;
}

export const setupSocket = (httpServer: HttpServer): SocketServer => {
	const io = new SocketServer(httpServer, {
		cors: {
			origin: process.env.CORS_ORIGIN || '*',
			methods: ['GET', 'POST'],
		},
	});

	// Authenticate socket connections with JWT
	io.use((socket, next) => {
		const token = socket.handshake.auth.token as string;
		if (!token) return next(new Error('Authentication required'));

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as AuthPayload;
			(socket as unknown as { data: SocketWithUser }).data = {
				userId: decoded.userId,
				userName: decoded.email,
			};
			next();
		} catch {
			next(new Error('Invalid token'));
		}
	});

	io.on('connection', (socket) => {
		const { userId } = (socket as unknown as { data: SocketWithUser }).data;
		console.log(`Socket connected: ${userId}`);

		// Client joins a household room to receive real-time updates
		socket.on('join:household', (householdId: string) => {
			socket.join(`household:${householdId}`);
			socket.to(`household:${householdId}`).emit('user:joined', { userId });
			console.log(`User ${userId} joined household:${householdId}`);
		});

		socket.on('leave:household', (householdId: string) => {
			socket.leave(`household:${householdId}`);
			socket.to(`household:${householdId}`).emit('user:left', { userId });
		});

		// Presence: user is currently viewing a list
		socket.on('viewing:list', (listId: string) => {
			socket.broadcast.emit('presence:viewing', { userId, listId });
		});

		socket.on('disconnect', () => {
			console.log(`Socket disconnected: ${userId}`);
		});
	});

	return io;
};
