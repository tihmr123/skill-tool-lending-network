# Neighborhood Skill and Tool Lending Network

A web app that lets neighbors list skills they can teach and tools they can lend, browse/search what's available, and send borrow requests. Built as a course project for Software Engineering.

Core flow: register/log in → list a skill or tool → browse/search listings → send a borrow request → owner accepts/declines → mark returned.

(Messaging and notifications were intentionally left out of scope per the project's SRS.)

## Tech stack

- **Backend:** Node.js, Express, SQLite (`better-sqlite3`), JWT auth, bcrypt
- **Frontend:** React (Vite), React Router, plain CSS

## Project structure

```
skill-lending-network/
  server/     Express API + SQLite database
  client/     React frontend (Vite)
```

## Running locally

### 1. Backend

```bash
cd server
npm install
cp .env.example .env    # edit JWT_SECRET if you like
npm start
```

The API runs at `http://localhost:4000`. A `data.sqlite` file is created automatically on first run.

### 2. Frontend

In a separate terminal:

```bash
cd client
npm install
npm run dev
```

The app runs at `http://localhost:5173` and talks to the API at `http://localhost:4000`.

## API overview

| Method | Endpoint                     | Description                          | Auth |
|--------|-------------------------------|---------------------------------------|------|
| POST   | `/api/auth/register`          | Create an account                     | –    |
| POST   | `/api/auth/login`              | Log in                                | –    |
| GET    | `/api/listings`                | Browse/search listings (`?q=&type=&category=`) | –    |
| GET    | `/api/listings/:id`             | Get one listing                       | –    |
| POST   | `/api/listings`                | Create a listing                      | ✔    |
| PUT    | `/api/listings/:id`             | Update a listing (owner only)         | ✔    |
| DELETE | `/api/listings/:id`             | Delete a listing (owner only)         | ✔    |
| GET    | `/api/listings/mine/list`       | Listings you own                      | ✔    |
| POST   | `/api/requests`                | Send a borrow request                 | ✔    |
| GET    | `/api/requests/sent`            | Requests you've sent                  | ✔    |
| GET    | `/api/requests/received`        | Requests received on your listings    | ✔    |
| PUT    | `/api/requests/:id`             | Accept / decline / mark returned      | ✔    |

## Data model

- **User** — id, name, email, password_hash
- **Listing** — id, owner_id, type (`skill`/`tool`), title, description, category, availability
- **BorrowRequest** — id, listing_id, requester_id, status (`pending`/`accepted`/`declined`/`returned`), message

This maps directly to the project's ER diagram and DFDs.

## Possible next steps

- Messaging between requester and owner
- Notifications (email or in-app) on request status changes
- Ratings/reviews after a completed borrow
- Location-based search