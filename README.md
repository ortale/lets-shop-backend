# 🛒 Shopping List App — Backend

Node.js + TypeScript + MySQL backend for the Shared Shopping List app.  
Features: Auth with JWT, real-time sync via Socket.io, barcode lookup, and full CRUD for households, lists, and items.

---

## Tech Stack

| Layer        | Technology              |
|--------------|-------------------------|
| Runtime      | Node.js + TypeScript    |
| Framework    | Express                 |
| Database     | MySQL via Prisma ORM    |
| Real-time    | Socket.io               |
| Auth         | JWT + bcryptjs          |
| Validation   | Zod                     |

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` with your MySQL credentials:
```
DATABASE_URL="mysql://root:yourpassword@localhost:3306/shopping_list_db"
JWT_SECRET=pick_a_long_random_string
```

### 3. Create the database
```sql
CREATE DATABASE shopping_list_db;
```

### 4. Run Prisma migrations
```bash
npm run db:migrate
```
This creates all tables automatically from the schema.

### 5. Start the dev server
```bash
npm run dev
```
Server runs at `http://localhost:3000`

---

## API Reference

### Auth
| Method | Endpoint               | Description              | Auth |
|--------|------------------------|--------------------------|------|
| POST   | `/api/v1/auth/register`| Create account           | ❌   |
| POST   | `/api/v1/auth/login`   | Login, get JWT token     | ❌   |
| GET    | `/api/v1/auth/me`      | Get current user + households | ✅ |

### Households
| Method | Endpoint                   | Description               | Auth |
|--------|----------------------------|---------------------------|------|
| POST   | `/api/v1/households`       | Create a household        | ✅   |
| POST   | `/api/v1/households/join`  | Join via invite code      | ✅   |

### Shopping Lists
| Method | Endpoint                                                  | Description                      | Auth |
|--------|-----------------------------------------------------------|----------------------------------|------|
| GET    | `/api/v1/households/:householdId/lists`                   | Get all lists                    | ✅   |
| POST   | `/api/v1/households/:householdId/lists`                   | Create a list                    | ✅   |
| PATCH  | `/api/v1/households/:householdId/lists/:listId`           | Update a list (name, emoji)      | ✅   |
| PATCH  | `/api/v1/households/:householdId/lists/:listId/complete`  | Toggle list as done/reopen       | ✅   |
| DELETE | `/api/v1/households/:householdId/lists/:listId`           | Delete a list                    | ✅   |

### Items
| Method | Endpoint                                        | Description           | Auth |
|--------|-------------------------------------------------|-----------------------|------|
| GET    | `/api/v1/lists/:listId/items`                   | Get items in list     | ✅   |
| POST   | `/api/v1/lists/:listId/items`                   | Add an item           | ✅   |
| PATCH  | `/api/v1/lists/:listId/items/:itemId`           | Update an item        | ✅   |
| PATCH  | `/api/v1/lists/:listId/items/:itemId/toggle`    | Check/uncheck item    | ✅   |
| DELETE | `/api/v1/lists/:listId/items/:itemId`           | Delete an item        | ✅   |
| DELETE | `/api/v1/lists/:listId/items/checked`           | Clear checked items   | ✅   |

### Barcode
| Method | Endpoint                    | Description                          | Auth |
|--------|-----------------------------|--------------------------------------|------|
| GET    | `/api/v1/barcode/:barcode`  | Lookup product info from barcode     | ✅   |

---

## Socket.io Events

### Client → Server
| Event             | Payload           | Description                          |
|-------------------|-------------------|--------------------------------------|
| `join:household`  | `householdId`     | Subscribe to household updates       |
| `leave:household` | `householdId`     | Unsubscribe from household updates   |
| `viewing:list`    | `listId`          | Broadcast presence to other members  |

### Server → Client
| Event             | Payload                   | Description                      |
|-------------------|---------------------------|----------------------------------|
| `list:created`    | `{ list }`                | New list was created             |
| `list:updated`    | `{ list }`                | List was renamed/updated         |
| `list:deleted`    | `{ listId }`              | List was deleted                 |
| `list:completed`  | `{ list }`                | List marked done / reopened      |
| `item:created`    | `{ listId, item }`        | New item added                   |
| `item:updated`    | `{ listId, item }`        | Item was edited                  |
| `item:toggled`    | `{ listId, item }`        | Item was checked/unchecked       |
| `item:deleted`    | `{ listId, itemId }`      | Item was deleted                 |
| `user:joined`     | `{ userId }`              | Member joined the household      |
| `presence:viewing`| `{ userId, listId }`      | Member is viewing a list         |

---

## Item Price & List Total

Each item has `price` (decimal) and `quantity` (integer) fields. The **list total is calculated on the client side**:

```
total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0)
```

The backend stores and returns both fields so the mobile app can display the running total in real time as items are added or prices updated.

---

## Project Structure

```
src/
├── config/
│   ├── prisma.ts       # Prisma client singleton
│   └── socket.ts       # Socket.io setup + auth
├── controllers/
│   ├── auth.controller.ts
│   ├── lists.controller.ts
│   ├── items.controller.ts
│   └── barcode.controller.ts
├── middleware/
│   └── auth.middleware.ts  # JWT authentication
├── routes/
│   └── index.ts
├── types/
│   └── index.ts
├── app.ts              # Express app
└── server.ts           # Entry point
prisma/
└── schema.prisma       # Database schema
```

---

## Deployment

The backend can be deployed to any Node.js host:

- **Railway** — `railway up` (supports MySQL add-on)
- **Render** — connect GitHub, add MySQL service
- **Fly.io** — `fly launch`

Remember to set your environment variables in the platform dashboard.
# lets-shop-backend
