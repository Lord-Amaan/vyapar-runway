# Vyapar Runway (Frontend)

Vyapar Runway helps small shop owners understand cash flow, forecast daily inflow, and check if they can safely place a supplier order.

Live app: https://vyapar-runway.vercel.app

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- Recharts

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Simple Architecture

- `frontend` renders dashboard, input forms, charts, and language-aware UI copy.
- `backend` (FastAPI) serves prediction, simulation, and advisor APIs.
- Frontend calls backend APIs for:
  - forecast generation from CSV data
  - Monte Carlo cash risk simulation
  - short actionable advisor suggestions

## Main Scripts

- `npm run dev` - run local development server
- `npm run build` - type-check and create production build
- `npm run lint` - run oxlint
- `npm run preview` - preview production build locally
