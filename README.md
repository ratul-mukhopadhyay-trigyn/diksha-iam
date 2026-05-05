# IAM Project (Node.js + Cassandra)

Node.js API service for SSO/OTP and user CRUD flows, backed by an external Cassandra cluster.

## Prerequisites

- Node.js 20+
- npm 10+
- Docker Desktop (for containerized run)
- Network access to the external Cassandra cluster

## Environment Setup

1. Copy `.envexample` to `.env`.
2. Fill all required values.

Minimum important variables:

- `CASSANDRA_CONTACT_POINTS` (comma-separated IPs/hosts)
- `CASSANDRA_LOCAL_DC`
- `CASSANDRA_KEYSPACE` 
- `SUNBIRD_ENCRYPTION_SALT`
- `AES_KEY_BASE64`
- `PORT` (optional, defaults to `3000`)
- `SUNBIRD_USERNAME_NUM_DIGITS` 

## Run Locally (Without Docker)

```bash
npm install
npm start
```

Health check:

- `GET /health`
- Example: `http://localhost:3000/health`

## API documentation (Swagger UI)

Interactive OpenAPI docs are served at:

- `GET /api-docs`
- Example: `http://localhost:3000/api-docs`

Use the same host and port as your app (`PORT` in `.env`, default `3000`).

## Run With Docker

Build and run:

```bash
docker compose up --build
```

Detached mode:

```bash
docker compose up --build -d
```

Stop:

```bash
docker compose down
```

The container runs only the Node service and still connects to your external Cassandra cluster via `.env`.

## Main API Endpoints

- `GET /api-docs` (Swagger UI)
- `GET /health`
- `GET /sso?email=...` or `GET /sso?phone=...`
- `POST /otp/generate`
- `POST /otp/verify`
- `POST /users`
- `GET /users/:id`
- `GET /users?email=...`
- `GET /users?phone=...`
- `PATCH /users/:id`
- `DELETE /users/:id`

