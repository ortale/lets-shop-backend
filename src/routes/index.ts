import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { register, login, me, createHousehold, joinHousehold } from '../controllers/auth.controller';
import { getLists, createList, updateList, deleteList, completeList } from '../controllers/lists.controller';
import { getItems, createItem, updateItem, toggleItem, deleteItem, clearCheckedItems } from '../controllers/items.controller';

const router = Router();

// ── Auth ───────────────────────────────────────────────
router.post('/auth/register', register);
router.post('/auth/login', login);
router.get('/auth/me', authenticate, me);

// ── Households ─────────────────────────────────────────
router.post('/households', authenticate, createHousehold);
router.post('/households/join', authenticate, joinHousehold);

// ── Shopping Lists ─────────────────────────────────────
router.get('/households/:householdId/lists', authenticate, getLists);
router.post('/households/:householdId/lists', authenticate, createList);
router.patch('/households/:householdId/lists/:listId', authenticate, updateList);
router.delete('/households/:householdId/lists/:listId', authenticate, deleteList);

// ── Items ──────────────────────────────────────────────
router.get('/lists/:listId/items', authenticate, getItems);
router.post('/lists/:listId/items', authenticate, createItem);
router.patch('/lists/:listId/items/:itemId', authenticate, updateItem);
router.patch('/lists/:listId/items/:itemId/toggle', authenticate, toggleItem);
router.delete('/lists/:listId/items/:itemId', authenticate, deleteItem);
router.delete('/lists/:listId/items/checked', authenticate, clearCheckedItems);

// ── Complete a list (done shopping) ───────────────────
router.patch('/households/:householdId/lists/:listId/complete', authenticate, completeList);

export default router;
