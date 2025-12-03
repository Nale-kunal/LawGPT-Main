## Migration Checklist – MongoDB/local uploads to Firebase Firestore + Cloudinary

### 1. Create and configure Firebase project

- **Create project** in the Firebase console.
- **Enable services**:
  - Firestore Database (in production mode or test mode, then tighten rules).
  - Authentication (Email/Password at minimum if you use it).
- **Create a service account** (Project Settings → Service Accounts → Generate new private key).
- **Store credentials** securely and reference them via:
  - `FIREBASE_SERVICE_ACCOUNT_PATH` (local path), or
  - `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_SERVICE_ACCOUNT_BASE64`, or
  - `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`.

### 2. Configure Cloudinary

- Create a Cloudinary account.
- From the Cloudinary console, copy:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Optionally create an **upload preset** if you plan to use unsigned/direct browser uploads and set `CLOUDINARY_UPLOAD_PRESET`.

### 3. Set environment variables

- Copy `backend/env.example` to `backend/.env`.
- Fill in:
  - `PORT`, `CORS_ORIGIN`, `JWT_SECRET`
  - Firebase admin credentials (one of the options described in the file)
  - Cloudinary credentials.
- If you still have legacy MongoDB data to migrate, also set `MONGODB_URI` (read‑only).

### 4. Verify backend uses Firestore + Cloudinary

- From `backend/`, run:
  - `npm install`
  - `npm run dev` (or `npm start` in production).
- Confirm log messages:
  - “Using Firebase Firestore for database”
  - “Using Cloudinary for media storage”
- Hit health endpoint: `GET /api/health` – should return `{ ok: true }`.

### 5. Run data migration (optional, one‑time)

- With MongoDB running and `MONGODB_URI` set, run from `backend/`:
  - `npm run migrate-local-to-firestore`
- This will:
  - Read from legacy MongoDB collections (via existing Mongoose models).
  - Write denormalised equivalents into Firestore collections listed in `backend/src/services/firestore.js` (`COLLECTIONS`).

### 6. Run media migration (optional, one‑time)

- Ensure Cloudinary env vars are set and valid.
- From `backend/`, run:
  - `npm run upload-media-to-cloudinary`
- This will:
  - Scan known `uploads/` directories (legacy local files).
  - Upload each file to Cloudinary.
  - Create corresponding `documents` entries in Firestore with Cloudinary URLs.

### 7. Validate CRUD behaviour and uploads

- From `backend/`, run:
  - `npm run test:db` (smoke tests hitting key API endpoints via `backend/test-api.js`).
- Manually verify:
  - Create → read → update → delete flows for:
    - Users (via auth flows),
    - Cases, Clients, Hearings, Invoices, Time Entries, Legal Sections, Alerts, Activities.
  - File upload:
    - `POST /api/documents/upload` with one or more files.
    - Response contains URLs pointing to Cloudinary, not local `/uploads/...` paths.

### 8. Deploy Firestore security rules

- Review `firebase/firestore.rules` and harden per your needs (collection‑specific rules, role‑based checks, etc.).
- From a Firebase‑initialised project (or CI), deploy rules:
  - `firebase deploy --only firestore:rules`

### 9. Production rollout considerations

- Ensure:
  - All sensitive env vars are set in your hosting platform.
  - MongoDB is made **read‑only** or decommissioned **after** you confirm Firestore data is complete.
  - Any old `/uploads` file serving is only kept for true legacy URLs; new uploads must go to Cloudinary.
- Monitor:
  - Firestore usage (reads/writes, indexes).
  - Cloudinary bandwidth and storage.
  - Authentication error logs (Firebase Auth).


