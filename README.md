# SplitMate — Smart Group Expense Tracker

A CE-1 full-stack project built with vanilla HTML/CSS/JavaScript, Bootstrap, Node.js, Express, MongoDB and Mongoose. It tracks group expenses, supports equal/custom splits, shows transparent calculations and suggests transfers using a greedy settlement algorithm.

## Requirements
- Node.js 18 or newer
- npm
- MongoDB Community Server running locally, or a MongoDB connection URI

## Run locally

```bash
# 1. Enter the project directory
cd splitmate

# 2. Install dependencies
npm install

# 3. Create local environment configuration
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` to a random string of at least 32 characters. Set `MONGODB_URI` to your MongoDB URI. For a local MongoDB server, the example URI is `mongodb://127.0.0.1:27017/splitmate`.

```bash
# 4. Start MongoDB if it is installed locally (run this in a separate terminal if needed)
# Windows: start MongoDB using the MongoDB service or MongoDB Compass
# macOS with Homebrew: brew services start mongodb-community
# Linux systemd: sudo systemctl start mongod

# 5. Optional: load fictional demo data (requires MongoDB to be running)
npm run seed

# 6. Start the application
npm start
```

Open **http://localhost:5000**. `npm run dev` runs the server with Node's watch mode. The server intentionally exits with a clear error if `JWT_SECRET` is weak or MongoDB is unreachable; it does not silently replace MongoDB with another store.

### Demo credentials
After running `npm run seed`:
- `aarav@splitmate.demo` / `SplitMateDemo2026!`
- `diya@splitmate.demo` / `SplitMateDemo2026!`
- `kabir@splitmate.demo` / `SplitMateDemo2026!`

Seed deletes and recreates the demo users and the groups owned by those demo users, along with their related expenses and settlements. It is scoped to the demo users, but review the script before running it on a shared database.

## Test

```bash
npm test
```

The automated Node tests cover equal split rounding, custom share validation, duplicate custom participants, greedy settlement balance clearing and zero-balance behavior. They do not require a running database. API integration tests require MongoDB and are not represented as passing by the unit test command.

## Main routes

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Server/database health |
| POST | `/api/auth/register` | Register and receive JWT |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current authenticated user |
| PATCH | `/api/users/me` | Update display name |
| GET/POST | `/api/groups` | List/create groups |
| GET/DELETE | `/api/groups/:id` | Read/delete group (owner-only delete) |
| POST | `/api/groups/:id/members` | Add registered member (owner only) |
| GET/POST | `/api/groups/:id/expenses` | List/create expenses |
| GET/PATCH/DELETE | `/api/expenses/:id` | Read/update/delete an expense |
| GET | `/api/groups/:id/balances` | Net balances and greedy transfer suggestions |
| GET/POST | `/api/groups/:id/settlements` | Settlement history/record transfer |
| GET | `/api/dashboard` | Database-backed overview and analytics |
| GET | `/api/users/search?q=...` | Search registered users by name/email |

Authenticated endpoints use `Authorization: Bearer <token>`. API responses use `{ "success": true, "message": "...", "data": ... }`; errors use `{ "success": false, "message": "..." }` and validation errors can include an `errors` array.

## Money and settlement rules
- Monetary values are stored as integer paise, never floating-point rupees.
- Equal splits distribute remainder paise deterministically so the shares sum exactly to the total.
- Custom shares must have exactly one non-negative integer-paise share for every selected participant and sum to the total.
- A payer's balance increases by the expense amount; each participant's balance decreases by their share. Confirmed settlements move the debtor's balance toward zero and reduce the recipient's credit.
- The greedy settlement algorithm repeatedly matches the largest outstanding debtor with the largest creditor. It creates practical suggestions, but it is **not guaranteed to minimize the global number of transactions**.
- Editing/deleting an expense changes the balance calculation because balances are derived from current expense and settlement records. Confirmed settlement records are retained. A new settlement can only be recorded if the payer currently owes and the recipient is currently owed, and the amount cannot exceed either side's current balance.

## Security notes
Passwords are bcrypt-hashed, JWTs are required for protected routes, group membership is checked server-side, input validation is applied to major write routes, request bodies are size-limited, and common security headers/rate limiting are enabled. For this student MVP, the JWT is kept in browser localStorage, which is vulnerable to token theft if an XSS vulnerability is introduced. A production deployment should consider secure, HttpOnly cookies, CSRF protection, stronger operational monitoring, and additional integration tests.

## Project structure

```text
src/
  config/db.js
  controllers/             # reserved for future controller extraction
  middleware/auth.js
  middleware/errors.js
  models/User.js
  models/Group.js
  models/Expense.js
  models/Settlement.js
  routes/api.js
  services/finance.js
  utils/http.js
  server.js
public/
  index.html
  css/styles.css
  js/app.js
tests/finance.test.js
scripts/seed.js
TASK_DIVISION.md
```

Bootstrap and Bootstrap Icons are loaded from jsDelivr; an internet connection is needed for those CDN assets unless you download and serve them locally.
