import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';
import { Server as SocketServer } from 'socket.io';
import { param } from '../utils/params';

const itemSchema = z.object({
	name: z.string().min(1),
	brand: z.string().optional(),
	barcode: z.string().optional(),
	imageUrl: z.string().url().optional(),
	category: z.string().optional(),
	quantity: z.number().int().min(1).default(1),
	unit: z.string().optional(),
	price: z.number().positive().optional(),
	notes: z.string().optional(),
});

const verifyListAccess = async (userId: string, listId: string) => {
	const list = await prisma.shoppingList.findUnique({
		where: { id: listId },
		include: { household: { include: { members: { where: { userId } } } } },
	});
	if (!list || list.household.members.length === 0) return null;
	return list;
};

export const getItems = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		const items = await prisma.item.findMany({
			where: { listId },
			include: { addedBy: { select: { id: true, name: true } } },
			orderBy: [{ isChecked: 'asc' }, { createdAt: 'asc' }],
		});
		res.json({ items });
	} catch { res.status(500).json({ error: 'Internal server error' }); }
};

export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const data = itemSchema.parse(req.body);
		const io: SocketServer = req.app.get('io');
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		const item = await prisma.item.create({
			data: { ...data, listId, addedById: req.user!.userId },
			include: { addedBy: { select: { id: true, name: true } } },
		});
		io.to(`household:${list.householdId}`).emit('item:created', { listId, item });
		res.status(201).json({ item });
	} catch (err) {
		if (err instanceof z.ZodError) { res.status(400).json({ error: 'Validation failed', details: err.issues }); return; }
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const itemId = param(req.params.itemId);
		const data = itemSchema.partial().parse(req.body);
		const io: SocketServer = req.app.get('io');
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		const item = await prisma.item.update({
			where: { id: itemId, listId },
			data,
			include: { addedBy: { select: { id: true, name: true } } },
		});
		io.to(`household:${list.householdId}`).emit('item:updated', { listId, item });
		res.json({ item });
	} catch (err) {
		if (err instanceof z.ZodError) { res.status(400).json({ error: 'Validation failed', details: err.issues }); return; }
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const toggleItem = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const itemId = param(req.params.itemId);
		const io: SocketServer = req.app.get('io');
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		const current = await prisma.item.findUnique({ where: { id: itemId } });
		if (!current) { res.status(404).json({ error: 'Item not found' }); return; }
		const item = await prisma.item.update({
			where: { id: itemId, listId },
			data: { isChecked: !current.isChecked, checkedAt: !current.isChecked ? new Date() : null },
			include: { addedBy: { select: { id: true, name: true } } },
		});
		io.to(`household:${list.householdId}`).emit('item:toggled', { listId, item });
		res.json({ item });
	} catch { res.status(500).json({ error: 'Internal server error' }); }
};

export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const itemId = param(req.params.itemId);
		const io: SocketServer = req.app.get('io');
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		await prisma.item.delete({ where: { id: itemId, listId } });
		io.to(`household:${list.householdId}`).emit('item:deleted', { listId, itemId });
		res.status(204).send();
	} catch { res.status(500).json({ error: 'Internal server error' }); }
};

export const clearCheckedItems = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const listId = param(req.params.listId);
		const io: SocketServer = req.app.get('io');
		const list = await verifyListAccess(req.user!.userId, listId);
		if (!list) { res.status(403).json({ error: 'Access denied' }); return; }
		await prisma.item.deleteMany({ where: { listId, isChecked: true } });
		io.to(`household:${list.householdId}`).emit('list:cleared', { listId });
		res.status(204).send();
	} catch { res.status(500).json({ error: 'Internal server error' }); }
};
