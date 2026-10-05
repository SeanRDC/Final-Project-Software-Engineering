<a id="readme-top"></a>

<div align="center">
  <h3 align="center">Frontend | HAU-Sync</h3>
  <p align="center">
    The browser client of HAU-Sync, the Patient Record Management and Appointment System for the Holy Angel University Clinic.
    <br />
    <br />
    <strong>Tags:</strong> <code>react</code>, <code>typescript</code>, <code>vite</code>, <code>tailwindcss</code>, <code>shadcn-ui</code>
  </p>
</div>

> **🚧 WORK IN PROGRESS:** The frontend is being built screen by screen on top of the finished backend API.

## Tech Stack

- **Language:** TypeScript
- **Framework:** React 19, built with Vite
- **Styling:** Tailwind CSS 4 and shadcn/ui components (Radix primitives)
- **Tests:** Vitest and Testing Library
- **Lint and format:** oxlint and Prettier

## Getting Started

### Prerequisites

- Node.js 20.19 or higher and `npm`
- The backend running on `http://localhost:8000` (see `backend/BACKEND-README.md`)

### Setup

```powershell
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`. The dev server forwards every request under `/api`, including the WebSocket, to the backend, so no CORS setup is needed in development. To use a backend on another address:

```powershell
$env:BACKEND_URL = "http://192.168.1.10:8000"; npm run dev
```

## Scripts

| Command              | What it does                                       |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Start the dev server with hot reload               |
| `npm run build`      | Type-check and build the static files into `dist/` |
| `npm run preview`    | Serve the built files locally                      |
| `npm test`           | Run the test suite once                            |
| `npm run test:watch` | Re-run tests as files change                       |
| `npm run lint`       | Lint with oxlint                                   |
| `npm run typecheck`  | Type-check without building                        |
| `npm run format`     | Format every file with Prettier                    |

<p align="right">(<a href="#readme-top">back to top</a>)</p>
