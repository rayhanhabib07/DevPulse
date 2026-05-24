# DevPulse 🚼

**Internal Tech Issue & Feature Tracker** — A collaborative REST API platform for software teams to report bugs, suggest features, and coordinate resolutions.

---

## 🌐 Live URL

```
https://dev-pulse-murex-six.vercel.app/health
```

---

## ✨ Features

- **Role-based access control** — `contributor` and `maintainer` roles with distinct permissions
- **JWT authentication** — stateless, secure token-based auth
- **Full issue lifecycle** — create, read, update, delete with status workflow
- **Smart filtering & sorting** — query issues by type, status, and creation date
- **No ORMs, no query builders** — raw SQL via `pg` pool only
- **TypeScript strict mode** — no `any` types, fully typed throughout
- **Modular architecture** — clean separation of concerns across modules

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| Node.js 24.x | LTS runtime |
| TypeScript 6.x | Strict static typing |
| Express.js | HTTP server & modular routing |
| PostgreSQL | Relational database |
| `pg` (native) | Raw SQL via `pool.query()` |
| `bcrypt` | Password hashing (10 salt rounds) |
| `jsonwebtoken` | JWT signing & verification |
| `http-status-codes` | Consistent HTTP status references |
| NeonDB / Supabase | Hosted PostgreSQL |
| Render / Railway | Deployment platform |

---

## 🚀 Local Setup

### Prerequisites
- Node.js 24+
- A PostgreSQL database (NeonDB recommended — free tier available at [neon.tech](https://neon.tech))

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/devpulse.git
cd devpulse

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and fill in DATABASE_URL and JWT_SECRET

# 4. Run database migrations
npm run db:migrate

# 5. Start the development server
npm run dev
```

The API will be available at `http://localhost:3000`.

---

## 🌿 Environment Variables

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@host:5432/devpulse?sslmode=require
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
```

---

## 🗄️ Database Schema

### `users`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| name | VARCHAR(255) | Required |
| email | VARCHAR(255) | Unique, required |
| password | VARCHAR(255) | Bcrypt hash, never returned |
| role | VARCHAR(20) | `contributor` \| `maintainer`, default `contributor` |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-refreshed |

### `issues`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | Auto-increment |
| title | VARCHAR(150) | Required, max 150 chars |
| description | TEXT | Required, min 20 chars |
| type | VARCHAR(20) | `bug` \| `feature_request` |
| status | VARCHAR(20) | `open` \| `in_progress` \| `resolved`, default `open` |
| reporter_id | INTEGER | References users.id (app-level validation) |
| created_at | TIMESTAMPTZ | Auto-set |
| updated_at | TIMESTAMPTZ | Auto-refreshed |

---

## 📬 API Endpoints

### Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Authenticate and receive JWT |

### Issues

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/issues` | Public | List all issues (filterable, sortable) |
| GET | `/api/issues/:id` | Public | Get single issue |
| POST | `/api/issues` | Authenticated | Create a new issue |
| PATCH | `/api/issues/:id` | Authenticated | Update title/description/type |
| PATCH | `/api/issues/:id/status` | Maintainer | Update workflow status |
| DELETE | `/api/issues/:id` | Maintainer | Delete an issue |

**Authorization header format:** `Authorization: <JWT_TOKEN>`

**GET /api/issues query parameters:**

| Param | Values | Default |
|---|---|---|
| `sort` | `newest`, `oldest` | `newest` |
| `type` | `bug`, `feature_request` | (all) |
| `status` | `open`, `in_progress`, `resolved` | (all) |

---

## 📦 Response Format

### Success
```json
{
  "success": true,
  "message": "Operation description",
  "data": { }
}
```

### Error
```json
{
  "success": false,
  "message": "Error description",
  "errors": "Details (development only)"
}
```

---

## 📁 Project Structure

```
src/
├── config/
│   ├── db.ts              # PostgreSQL pool
│   └── migrate.ts         # Table creation script
├── middleware/
│   ├── authenticate.ts    # JWT verification
│   ├── authorize.ts       # Role-based guard factory
│   └── errorHandler.ts    # Global error handler
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   └── auth.router.ts
│   └── issues/
│       ├── issues.controller.ts
│       └── issues.router.ts
├── types/
│   ├── index.ts           # Domain interfaces
│   └── express.d.ts       # Request augmentation
├── utils/
│   ├── asyncHandler.ts    # Async route wrapper
│   ├── jwt.ts             # Sign & verify helpers
│   ├── response.ts        # Standardised responses
│   └── validators.ts      # Input validation helpers
├── app.ts                 # Express app factory
└── index.ts               # Server entry point
```

---

## 👥 User Roles

| Role | Permissions |
|---|---|
| `contributor` | Register, login, create issues, view all issues, edit own open issues |
| `maintainer` | All contributor permissions + edit any issue, delete any issue, change issue status |

---

## 🔐 Security Notes

- Passwords are hashed with bcrypt (10 salt rounds) and **never** returned in any response
- JWT tokens include `id`, `name`, `role` in the payload
- Protected routes reject requests without a valid, non-expired token
- Role verification occurs before every privileged operation

---

## 📝 License

MIT
