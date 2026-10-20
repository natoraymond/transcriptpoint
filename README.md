This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Neon database

1. Create a Neon project and copy its pooled connection string into `DATABASE_URL` in `.env.local`.
2. Run `npm run db:migrate`. This executes `db/schema.sql` and creates the transcript and identity tables.
3. Run `npm run db:bootstrap-super-admin` once in an interactive terminal. It asks for the initial Super Admin email, name, and password (the password is masked). It can grant the role to that existing account or create it, and refuses to run after the first Super Admin has been established.
4. Start the app with `npm run dev`. Users can self-register with the User role; only a Super Admin can create accounts or grant elevated roles.

Configure `APP_URL` to the exact site origin (`http://localhost:3000` locally and your HTTPS deployment origin in production), along with `RESEND_API_KEY` and a verified `EMAIL_FROM`, to enable required email verification during public registration and privileged account setup. Set `MAX_PORTAL_ACCOUNTS` to an appropriate registration cap (default: 10,000).

The schema stores the applicant, graduation, delivery, status, and payment fields needed to process a request. Payment and workflow columns are included so the request record can grow without changing the form contract.

Transcript service labels, NGN prices, categories, and DHL requirements are maintained in the `transcript_options` table. The request form fetches active options from `/api/transcript-options`, grouped by category; hardcopy options automatically require the DHL destination flow. Request validation, payment display, Paystack verification, receipts, and the assistant use the same database catalog. Run `npm run db:migrate` to seed the softcopy options, hardcopy options, and current catalog prices. Update services in `transcript_options` rather than in client code.

## Payment confirmation emails

After Paystack reports a successful checkout, the app verifies the transaction using `PAYSTACK_SECRET_KEY`, confirms the amount and applicant email against the saved request, marks that database request as paid, and sends an invoice-style receipt to the applicant's email address using Resend. The email contains the request and payment details read from the database. Configure `RESEND_API_KEY` and `EMAIL_FROM` using a sender address verified in Resend. Keep the Paystack secret and Resend API key server-side; only the Paystack public key belongs in a `NEXT_PUBLIC_` variable.

Run `npm run db:migrate` after pulling this change to add the receipt delivery timestamp to existing databases.

## AI assistant

Add `OPENAI_API_KEY` to `.env.local` and optionally set `OPENAI_MODEL`. Then run `npm run db:migrate` to create the assistant conversation and message tables. Open `/assistant` to chat with TranscriptPoint AI Assistant.

## Role-based accounts and access

Authentication uses a database-backed session cookie (HttpOnly, SameSite=Lax, Secure in production) and scrypt password hashes. User registration only creates User accounts after email verification in production (local development without email configuration activates local test accounts automatically). The Super Admin can create accounts using expiring email setup invitations, grant User/Admin/Super Admin roles, assign Admin permissions, and suspend accounts. Admin API handlers check permissions on every request; user profile, activity, transcript history, payment verification, and assistant conversations are scoped to the signed-in account. After authentication, each role is sent to its own dashboard at `/dashboard`, `/admin`, or `/super-admin`.

The first Super Admin bootstrap is deliberately a one-time operation. Set the bootstrap variables only in a trusted local environment, run the bootstrap command after migrations, and remove the password from the environment afterwards. In production, apply `db/schema.sql` through a trusted migration run before deployment and use a long unique initial password. Never expose `DATABASE_URL` or bootstrap credentials in `NEXT_PUBLIC_` variables.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
