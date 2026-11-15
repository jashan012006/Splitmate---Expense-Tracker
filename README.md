 # SplitMate – Smart Group Expense Tracker

**SplitMate** is a full-stack group expense management application designed to simplify shared expenses among friends, roommates, and groups. It allows users to create groups, record expenses, split costs equally or through custom contributions, track individual balances, and generate optimized settlement suggestions.

Built using **Vanilla JavaScript, Bootstrap, Node.js, Express.js, MongoDB, and Mongoose**, SplitMate provides transparent expense calculations and a practical approach to managing shared finances.

 # Key Features

- **User Authentication:** Secure user registration and login using JWT-based authentication and bcrypt password hashing.
- **Group Management:** Create and manage expense-sharing groups and add registered members.
- **Expense Tracking:** Record, update, view, and delete group expenses.
- **Flexible Expense Splitting:** Supports equal splitting and custom participant-wise expense distribution.
- **Balance Calculation:** Automatically calculates how much each participant owes or is owed.
- **Smart Settlement Suggestions:** Uses a greedy settlement algorithm to minimize the number of suggested transfers through debtor-creditor matching.
- **Settlement Management:** Record completed payments and maintain settlement history.
- **Dashboard & Analytics:** Provides a database-backed overview of groups, expenses, and financial activity.
- **User Search:** Find registered users by name or email.
- **Input Validation & Security:** Implements protected API routes, server-side membership checks, request validation, rate limiting, and security headers.

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| UI Framework | Bootstrap, Bootstrap Icons |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Tokens (JWT), bcrypt |
| Testing | Node.js Test Runner |

## Core Technical Implementations

### 1. Greedy Debt Settlement Algorithm
Implements a greedy algorithm that matches the largest outstanding debtor with the largest creditor to generate practical settlement suggestions and reduce unnecessary transactions. The algorithm is not guaranteed to produce the globally minimum number of transactions.

### 2. Accurate Financial Calculations
- Stores monetary values as integer paise to avoid floating-point precision errors.
- Handles equal-split remainder distribution deterministically.
- Validates custom participant shares to ensure they match the total expense.
- Calculates net balances using expense and settlement records.

### 3. RESTful API Architecture
Built REST API endpoints for authentication, user management, groups, expenses, balances, settlements, and dashboard analytics, with standardized JSON responses and centralized error handling.

## Project Structure

```text
SplitMate/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── public/
│   ├── css/
│   ├── js/
│   └── index.html
├── scripts/
├── tests/
├── .env.example
├── .gitignore
├── package.json
├── TASK_DIVISION.md
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18 or newer
- npm
- MongoDB Community Server or a MongoDB connection URI

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/jashan012006/Splitmate---Expense-Tracker.git
cd Splitmate---Expense-Tracker
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env` file using `.env.example` as a reference.

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/splitmate
JWT_SECRET=your_random_secret_of_at_least_32_characters
```

Use a strong, randomly generated JWT secret. Never commit your `.env` file.

**4. Start the application**

```bash
npm start
```

Open the application at:

`http://localhost:5000`

For development with automatic server restarts:

```bash
npm run dev
```

### Optional: Load Demo Data

With MongoDB running:

```bash
npm run seed
```

This creates fictional demo users and sample group data. The seed script deletes and recreates data belonging to its designated demo users, so review it before running against a shared database.

### Demo Credentials

| Email | Password |
|---|---|
| aarav@splitmate.demo | SplitMateDemo2026! |
| diya@splitmate.demo | SplitMateDemo2026! |
| kabir@splitmate.demo | SplitMateDemo2026! |

## Testing

Run the automated test suite:

```bash
npm test
```

The unit tests cover:
- Equal expense split calculations and rounding.
- Custom share validation.
- Duplicate participant validation.
- Greedy settlement balance clearing.
- Zero-balance scenarios.

The finance unit tests do not require a running MongoDB instance. API integration tests require MongoDB.

## Security Considerations

- Passwords are hashed using bcrypt.
- JWT authentication protects restricted API endpoints.
- Server-side authorization checks enforce group membership.
- Request validation and payload size limits help prevent invalid requests.
- Security headers and rate limiting provide additional protection.

**Note:** This is a student MVP. JWT tokens are stored in browser localStorage, which carries security risks in the presence of XSS vulnerabilities. Production deployment would require additional security hardening.

## Future Enhancements

- Secure HttpOnly cookie-based authentication.
- Expense visualization and advanced analytics.
- Notifications for pending settlements.
- Recurring expenses and payment reminders.
- Additional API integration and security testing.

## Author

Jashan Mukheja

BE Computer Science & Engineering

[GitHub Profile](https://github.com/jashan012006)


SplitMate – Making shared expenses simpler, clearer, and easier to settle.
