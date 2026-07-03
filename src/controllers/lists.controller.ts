import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { Server as SocketServer } from 'socket.io';
import { param } from '../utils/params';

const listSchema = z.object({
	name: z.string().min(1),
	emoji: z.string().optional(),
});

const verifyMembership = async (userId: string, householdId: string): Promise<boolean> => {
	const member = await prisma.householdMember.findUnique({
		where: { householdId_userId: { householdId, userId } },
	});
	return !!member;
};

export const getLists = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const householdId = param(req.params.householdId);
		if (!(await verifyMembership(req.user!.userId, householdId))) {
			res.status(403).json({ error: 'Not a member of this household' });
			return;
		}
		const lists = await prisma.shoppingList.findMany({
			where: { householdId },
			include: {
				_count: { select: { items: true } },
				items: { where: { isChecked: false }, select: { id: true } },
			},
			orderBy: { createdAt: 'asc' },
		});
		res.json({ lists });
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const createList = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const householdId = param(req.params.householdId);
		const data = listSchema.parse(req.body);
		const io: SocketServer = req.app.get('io');
		if (!(await verifyMembership(req.user!.userId, householdId))) {
			res.status(403).json({ error: 'Not a member of this household' });
			return;
		}
		const list = await prisma.shoppingList.create({ data: { ...data, householdId } });
		io.to(`household:${householdId}`).emit('list:created', { list });
		res.status(201).json({ list });
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateList = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const householdId = param(req.params.householdId);
		const listId = param(req.params.listId);
		const data = listSchema.partial().parse(req.body);
		const io: SocketServer = req.app.get('io');
		if (!(await verifyMembership(req.user!.userId, householdId))) {
			res.status(403).json({ error: 'Not a member of this household' });
			return;
		}
		const list = await prisma.shoppingList.update({ where: { id: listId, householdId }, data });
		io.to(`household:${householdId}`).emit('list:updated', { list });
		res.json({ list });
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const completeList = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const householdId = param(req.params.householdId);
		const listId = param(req.params.listId);
		const io: SocketServer = req.app.get('io');

		if (!(await verifyMembership(req.user!.userId, householdId))) {
			res.status(403).json({ error: 'Not a member of this household' });
			return;
		}

		// Toggle: if already completed, reopen it
		const current = await prisma.shoppingList.findUnique({ where: { id: listId } });
		if (!current) { res.status(404).json({ error: 'List not found' }); return; }

		const list = await prisma.shoppingList.update({
			where: { id: listId, householdId },
			data: {
				isCompleted: !current.isCompleted,
				completedAt: !current.isCompleted ? new Date() : null,
			},
		});

		io.to(`household:${householdId}`).emit('list:completed', { list });
		res.json({ list });
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const deleteList = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const householdId = param(req.params.householdId);
		const listId = param(req.params.listId);
		const io: SocketServer = req.app.get('io');
		if (!(await verifyMembership(req.user!.userId, householdId))) {
			res.status(403).json({ error: 'Not a member of this household' });
			return;
		}
		await prisma.shoppingList.delete({ where: { id: listId, householdId } });
		io.to(`household:${householdId}`).emit('list:deleted', { listId });
		res.status(204).send();
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
};
