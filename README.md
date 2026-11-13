# RevenueForge — Lead Management Dashboard

A browser-based lead-management prototype for organising prospects and tracking a simple sales pipeline.

**Live demo:** https://tuquash.github.io/RevenueForge/

## Current features

- Supabase email authentication and session handling
- Create, view, edit and delete leads
- Lead stages: New, Contacted and Converted
- Search and status filtering
- Follow-up message templates for email, WhatsApp and LinkedIn
- Dashboard counts and conversion summaries
- Responsive dashboard pages

## Technology

HTML, CSS, JavaScript, Supabase Auth, Supabase PostgreSQL and GitHub Pages.

## Database expectations

The application expects a Supabase `leads` table containing:

| Column | Purpose |
|---|---|
| `id` | Lead identifier |
| `user_id` | Authenticated owner |
| `name` | Prospect name |
| `email` | Prospect email |
| `service` | Service or interest |
| `status` | New, Contacted or Converted |
| `created_at` | Creation timestamp |

Enable Row Level Security on the table. Policies must restrict SELECT, INSERT, UPDATE and DELETE to rows where `auth.uid() = user_id`. For INSERT, enforce `WITH CHECK (auth.uid() = user_id)`; for UPDATE, enforce both USING and WITH CHECK. Do not rely on frontend filtering for access control.

## Setup

1. Create a Supabase project.
2. Create the `leads` table with the columns above.
3. Enable RLS and add owner-only policies for all CRUD operations.
4. Configure `supabase-config.js` with your project URL and Supabase publishable key.
5. Serve the folder using a local static web server, or deploy it to GitHub Pages.
6. Configure Supabase Auth's allowed redirect URLs for your local and deployed URLs.

Example configuration (replace both placeholders):

```js
window.REVENUEFORGE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
window.REVENUEFORGE_SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

A Supabase publishable key is designed for client-side use when RLS is correctly configured. **Never expose a service-role or secret key in frontend code or GitHub.**

## Limitations

- Follow-up content is generated as text templates; it is not sent automatically.
- Reports are basic counts and conversion-rate summaries.
- No payment processing, revenue attribution or external CRM integration is implemented.
- This project has not been independently security-audited.

## Run locally

Open the project through a local static server. Authentication and database features require a correctly configured Supabase project and internet access.

## Author

Tuquash — https://github.com/Tuquash
