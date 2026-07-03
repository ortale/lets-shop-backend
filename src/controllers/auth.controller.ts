import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../types';

const registerSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
});

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

const signToken = (userId: string, email: string): string => {
	return jwt.sign(
		{ userId, email },
		process.env.JWT_SECRET as string,
		{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
	);
};

export const register = async (req: Request, res: Response): Promise<void> => {
	try {
		const data = registerSchema.parse(req.body);

		const existing = await prisma.user.findUnique({ where: { email: data.email } });
		if (existing) {
			res.status(409).json({ error: 'Email already in use' });
			return;
		}

		const passwordHash = await bcrypt.hash(data.password, 12);
		const user = await prisma.user.create({
			data: { name: data.name, email: data.email, passwordHash },
			select: { id: true, name: true, email: true, createdAt: true },
		});

		// Auto-create a personal household — client never needs to know
		const inviteCode = uuidv4().substring(0, 8).toUpperCase();
		const household = await prisma.household.create({
			data: {
				name: `${user.name}'s Household`,
				inviteCode,
				members: {
					create: { userId: user.id, role: 'OWNER' },
				},
			},
			select: { id: true, name: true, inviteCode: true },
		});

		const token = signToken(user.id, user.email);
		res.status(201).json({ user, household, token });
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const login = async (req: Request, res: Response): Promise<void> => {
	try {
		const data = loginSchema.parse(req.body);

		const user = await prisma.user.findUnique({ where: { email: data.email } });
		if (!user) {
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		const valid = await bcrypt.compare(data.password, user.passwordHash);
		if (!valid) {
			res.status(401).json({ error: 'Invalid credentials' });
			return;
		}

		const token = signToken(user.id, user.email);
		res.json({
			user: { id: user.id, name: user.name, email: user.email },
			token,
		});
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user!.userId },
			select: {
				id: true,
				name: true,
				email: true,
				createdAt: true,
				householdMemberships: {
					include: { household: { select: { id: true, name: true, inviteCode: true } } },
				},
			},
		});

		if (!user) {
			res.status(404).json({ error: 'User not found' });
			return;
		}

		res.json({ user });
	} catch {
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const createHousehold = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const { name } = z.object({ name: z.string().min(2) }).parse(req.body);
		const inviteCode = uuidv4().substring(0, 8).toUpperCase();

		const household = await prisma.household.create({
			data: {
				name,
				inviteCode,
				members: {
					create: { userId: req.user!.userId, role: 'OWNER' },
				},
			},
			include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
		});

		res.status(201).json({ household });
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const joinHousehold = async (req: AuthRequest, res: Response): Promise<void> => {
	try {
		const { inviteCode } = z.object({ inviteCode: z.string().length(8) }).parse(req.body);

		const household = await prisma.household.findUnique({ where: { inviteCode } });
		if (!household) {
			res.status(404).json({ error: 'Household not found' });
			return;
		}

		const existing = await prisma.householdMember.findUnique({
			where: { householdId_userId: { householdId: household.id, userId: req.user!.userId } },
		});

		if (existing) {
			res.status(409).json({ error: 'Already a member of this household' });
			return;
		}

		await prisma.householdMember.create({
			data: { householdId: household.id, userId: req.user!.userId, role: 'MEMBER' },
		});

		res.json({ household: { id: household.id, name: household.name } });
	} catch (err) {
		if (err instanceof z.ZodError) {
			res.status(400).json({ error: 'Validation failed', details: err.issues });
			return;
		}
		res.status(500).json({ error: 'Internal server error' });
	}
};
