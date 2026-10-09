# Neighborhood Skill and Tool Lending Network

A web app where neighbors list skills they can teach and tools they can lend, browse and filter what is available, and send requests. Built as a course project for Software Engineering.

Core flow: register or log in, list a skill or tool, browse and filter listings, send a request, the owner accepts or declines, the item is returned (or the session completed), and the borrower leaves a review.

Messaging, notifications and online payments are intentionally out of scope. Deposits are shown on listings and settled in person.

## Features

- Accounts with JWT login, hashed passwords, and input validation
- Skill and tool listings with category, area, and an optional refundable deposit (tools only)
- Search by text, plus filters for type, category and area
- Edit, pause, and delete your own listings
- Request flow with a strict status path: pending, then accepted or declined, then returned (tools) or completed (skills)
- Tools become unavailable while lent out and free up when returned; skills stay open to other learners
- Owner and borrower emails are revealed to each other only after a request is accepted
- Requesters can cancel pending requests
- Condition notes when a tool is returned
- Reviews (1 to 5 stars) after a request is returned, with average ratings on listings
- Automated API tests

## Tech stack

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT, bcrypt, helmet, express-rate-limit
- **Frontend:** React (Vite), React Router, plain CSS
- **Tests:** Node's built-in test runner

## Project structure

```
skill-lending-network/
  server/
    app.js            Express app (middleware and routes)
    index.js          Starts the server
    db.js             SQLite schema
    middleware/       Auth and rate limiting
    routes/           auth, listings, requests, reviews
    tests/            API tests
  client/
    src/
      pages/          Browse, Login, Register, listing pages, Requests
      components/     Navbar, ListingCard, ListingForm, Rating, ProtectedRoute
      context/        Auth state
```

## Running locally

### 1. Backend

```bash
cd server
npm install
cp .env.example .env     # on Windows: copy .env.example .env
npm start
```

Open `server/.env` and replace `JWT_SECRET` with a long random string. You can generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The API runs at `http://localhost:4000`. `data.sqlite` is created automatically on first run. For development, `npm run dev` restarts the server whenever you save a file.

### 2. Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. The frontend talks to `http://localhost:4000/api` by default. To point it elsewhere, copy `client/.env.example` to `client/.env` and set `VITE_API_URL`.

### 3. Tests

```bash
cd server
npm test
```

Tests run against a temporary in-memory database, so they never touch your real data.

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `PORT` | server | API port (default 4000) |
| `JWT_SECRET` | server | Secret used to sign login tokens (required in production) |
| `CLIENT_ORIGIN` | server | Allowed frontend origin(s), comma separated (default `http://localhost:5173`) |
| `VITE_API_URL` | client | API base URL (default `http://localhost:4000/api`) |

## API overview

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create an account | No |
| POST | `/api/auth/login` | Log in | No |
| GET | `/api/listings` | Browse and search (`?q=&type=&category=&area=`) | No |
| GET | `/api/listings/meta/filters` | Categories and areas in use | No |
| GET | `/api/listings/:id` | One listing, with rating | No |
| GET | `/api/listings/mine/list` | Your listings | Yes |
| POST | `/api/listings` | Create a listing | Yes |
| PUT | `/api/listings/:id` | Edit a listing (owner only) | Yes |
| DELETE | `/api/listings/:id` | Delete a listing (owner only) | Yes |
| POST | `/api/requests` | Send a request | Yes |
| GET | `/api/requests/sent` | Requests you sent | Yes |
| GET | `/api/requests/received` | Requests on your listings | Yes |
| PUT | `/api/requests/:id` | Accept, decline, or mark returned (owner only) | Yes |
| DELETE | `/api/requests/:id` | Cancel your pending request | Yes |
| POST | `/api/reviews` | Review a returned request (requester only) | Yes |
| GET | `/api/reviews/listing/:listingId` | Reviews for a listing | No |

## Data model

- **User**: id, name, email (unique), password_hash
- **Listing**: id, owner_id, type (`skill` or `tool`), title, description, category, area, deposit_amount, availability
- **BorrowRequest**: id, listing_id, requester_id, status (`pending`, `accepted`, `declined`, `returned`), message, damage_notes
- **Review**: id, request_id (unique), listing_id, reviewer_id, rating (1 to 5), comment

## Design decisions

- **Skills and tools share one flow.** A skill session is "completed" instead of "returned", and skills stay available after acceptance because one teacher can have several learners.
- **No messaging.** After acceptance, both sides see each other's email to arrange the handoff.
- **Booking rules live on the server.** Status changes follow a fixed path, duplicate active requests are blocked, and accepting a tool declines the other pending requests.

## Demo

(Add a screen recording or GIF here.)

## Possible next steps

- In-app messaging and notifications
- Deployment to a hosting platform
- Frontend component tests
- Photos on listings