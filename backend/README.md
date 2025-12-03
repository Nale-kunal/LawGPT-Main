# Backend API - Lawyer Zen

Express.js backend API for the Lawyer Zen application.

## Features

- RESTful API with Express.js
- **Firebase Firestore** for structured data
- **Firebase Authentication** (via ID tokens) with optional JWT compatibility
- **Cloudinary** for file/media storage (images, videos, documents)
- File upload handling with Multer (memory storage → Cloudinary)
- CORS support for cross-origin requests

## Prerequisites

- Node.js (v18 or higher)
- Firebase project with Firestore + Auth enabled
- Cloudinary account for media storage

## Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Copy the `env.example` file to `.env`:

```bash
cp env.example .env
```

Edit `.env` and update the variables documented in `env.example`, including:

- `PORT`, `CORS_ORIGIN`, `JWT_SECRET`
- Firebase Admin credentials (one of `FIREBASE_SERVICE_ACCOUNT_*` or `FIREBASE_PROJECT_ID` / `FIREBASE_PRIVATE_KEY` / `FIREBASE_CLIENT_EMAIL`)
- `FIREBASE_WEB_API_KEY` (or `FIREBASE_API_KEY`)
- Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

## Running the Server

### Development Mode

```bash
npm run dev
```

This will start the server with auto-reload on file changes, using **Firestore** as the database and **Cloudinary** for media storage.

### Production Mode

```bash
npm start
```

The server will run on the port specified in your `.env` file (default: 5000).

## API Endpoints

All API endpoints are prefixed with `/api`:

- `/api/health` - Health check endpoint
- `/api/auth/*` - Authentication routes
- `/api/cases/*` - Case management
- `/api/clients/*` - Client management
- `/api/documents/*` - Document management
- `/api/hearings/*` - Hearing management
- `/api/invoices/*` - Invoice management
- `/api/alerts/*` - Alert management
- `/api/time-entries/*` - Time tracking
- `/api/legal-sections/*` - Legal research
- `/api/dashboard/*` - Dashboard data

## Database

All application data is stored in **Firebase Firestore**. Collection names are defined in `src/services/firestore.js` (`COLLECTIONS`).

### Seed Legal Sections (Optional)

```bash
npm run seed:legal
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/lawyer_zen` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `CORS_ORIGIN` | Frontend URL for CORS | `http://localhost:8080` |
| `NODE_ENV` | Environment (development/production) | `development` |

## File Uploads

New uploads are sent to **Cloudinary** using in-memory uploads via Multer and the helper in `src/config/cloudinary.js`.

Existing legacy files in `uploads/` may still be served via `/uploads` for backwards compatibility, but new uploads are stored in Cloudinary and referenced from Firestore.

## CORS Configuration

The backend supports CORS for the frontend URL specified in `CORS_ORIGIN`. In production, update this to match your deployed frontend URL.

For multiple origins, you can provide a comma-separated list:
```
CORS_ORIGIN=http://localhost:8080,https://your-frontend-domain.com
```

## Authentication

The API uses JWT tokens stored in HTTP-only cookies. All protected routes require a valid authentication token.

## Deployment

1. Set `NODE_ENV=production` in your `.env` file
2. Update `CORS_ORIGIN` to your production frontend URL
3. Use a strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
4. Ensure Firebase + Cloudinary credentials are set correctly in your hosting environment
5. Run `npm start` or use a process manager like PM2

## Migration & Testing Helpers

- **Migrate legacy MongoDB data to Firestore** (one-time, optional):

  ```bash
  # from backend/
  npm run migrate-local-to-firestore
  ```

- **Upload legacy local files to Cloudinary** (one-time, optional):

  ```bash
  # from backend/
  npm run upload-media-to-cloudinary
  ```

- **Smoke-test key CRUD endpoints**:

  ```bash
  # from backend/
  npm run test:db
  ```

For a full end-to-end checklist, see `../migration-checklist.md`.

## Troubleshooting

### MongoDB Connection Failed
- Ensure MongoDB is running
- Check the `MONGODB_URI` in your `.env` file
- For MongoDB Atlas, ensure your IP is whitelisted

### Port Already in Use
- Change the `PORT` in your `.env` file
- Or kill the process using the port

### CORS Errors
- Verify `CORS_ORIGIN` matches your frontend URL exactly
- Check that credentials are included in frontend requests

