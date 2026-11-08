# TogoTransit

Multi-company **bus and parcel platform for Togo**: travellers book seats and receive tickets with a QR code, transport companies run their fleet, trips, bookings and parcels from an admin portal, and a platform supervisor oversees every company.

> **Français :** plateforme web et API de TogoTransit — réservation de billets de bus avec QR code, gestion de colis avec preuve de livraison, et portail de gestion multi-compagnies pour le Togo. Projet de mémoire de licence en développement web.

**Live:** <https://togotransit-antg.vercel.app>
**Mobile app:** [`togotransit-mobile`](https://github.com/mitch117-web/togotransit-mobile) (Expo / React Native, uses this API)

## Features

- **Tickets with QR codes** — printable PDF tickets; each QR code opens a public verification page (`/billet/[numero]`), and staff can validate tickets through the API or the mobile scanner
- **Counter sales** — staff create bookings for walk-in customers, choose the seat, and print the ticket right away
- **Cancellations** — a company manager can cancel a customer's booking from the portal
- **Parcels** — registration, assignment to a driver, status updates, GPS location, printable label and **proof of delivery**; public tracking page (`/tracking`)
- **Fleet, trips, fares, users** — managed per company
- **Multi-company by design** — each company only sees its own data
- **Roles** — `super_admin` (platform supervisor, read-only on company operations), `gestionnaire` (company manager), `voyageur` (customer; drivers are customers assigned to trips)
- **Security** — JWT sessions, bcrypt password hashing, Zod input validation, role checks in the interface, on the pages and again in the API, database-backed rate limiting (works on serverless)
- **Languages** — French and Éwé dictionaries
- **Assistant chatbot** — uses OpenAI when an API key is configured, otherwise answers from the database with simple rules

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL (Neon) with Prisma 7 |
| Validation | Zod |
| PDF tickets | jsPDF |
| Hosting | Vercel |

## Getting started

Requirements: Node.js 20.9 or newer, a PostgreSQL database.

```bash
git clone https://github.com/mitch117-web/togotransit.git
cd togotransit
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_SECRET

# create the tables, then load demo data (LOCAL DEVELOPMENT ONLY)
node --env-file=.env ./node_modules/prisma/build/index.js migrate deploy
npx tsx --env-file=.env prisma/seed.ts

npm run dev                 # http://localhost:3000
```

Prisma 7 and `tsx` do not read `.env` on their own, which is why the two database commands pass `--env-file=.env`. `next dev` loads it automatically.

Generate a strong `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

> **Warning:** `npm run build` runs `prisma migrate deploy` before building. Never run it (or the seed script) with a `DATABASE_URL` that points to a production database unless you mean to.

## Environment variables

See [`.env.example`](.env.example). Only `DATABASE_URL` and `JWT_SECRET` are required; everything else is optional (chatbot, e-mail, Mobile Money).

## Demo accounts

`prisma/seed.ts` creates demo accounts (a platform super admin, three company managers, a driver and a traveller). **No password is stored in this repository.** Each password comes from a `NEXT_PUBLIC_DEMO_PASSWORD_*` variable in your local `.env`; if a variable is empty, the seed generates a random password and prints it at the end.

The quick-fill buttons under "Accès développement" on `/login` read the same variables and are only rendered by `npm run dev`: a production build contains neither the buttons nor the passwords. Never define these variables on Vercel, and never run the seed against a production database.

## Project structure

```
src/app/            pages (admin portal, login, tracking, ticket verification) and API routes
src/lib/            authentication, JWT, PDF tickets, rate limiting, validation schemas, i18n
prisma/             schema, migrations, seed scripts
public/brand/       logos
```

## Known limits

- **SMS is simulated**: messages are logged on the server, not sent.
- **Mobile Money (Flooz / T-Money)**: the PayGate client and the signed webhook are implemented, but no real operator account is connected in this project.
- **E-mail** goes through Resend; without a verified domain it can only reach the account owner.
- The OCR and translation API routes are placeholders.
- There is no automated test suite in this repository.

## Author

Michel ANAKPA, web developer based in Lomé, Togo.
