import { Request } from 'express';

export interface AuthPayload {
	userId: string;
	email: string;
}

export interface AuthRequest extends Request {
	user?: AuthPayload;
}

export interface SocketUser {
	userId: string;
	householdId: string;
	name: string;
}

// Socket event payloads
export interface ItemChangedPayload {
	listId: string;
	item: {
		id: string;
		name: string;
		isChecked: boolean;
		quantity: number;
		price?: number | null;
		updatedAt: Date;
	};
	changedBy: string; // user name
}

export interface ListChangedPayload {
	householdId: string;
	list: {
		id: string;
		name: string;
		emoji?: string | null;
	};
	action: 'created' | 'updated' | 'deleted';
}
