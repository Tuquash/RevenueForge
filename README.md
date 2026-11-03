
# RevenueForge

A lightweight lead management and sales pipeline dashboard built to help individuals and small businesses organise prospects, track lead progress and manage follow-up communication.

**Live Demo:** https://tuquash.github.io/RevenueForge/

## Features

- **Authentication:** Account login and session management using Supabase.
- **Lead Management:** Create, view, edit and delete leads.
- **Lead Tracking:** Organise prospects into New, Contacted and Converted stages.
- **Search and Filtering:** Find leads by name, email or service and filter by status.
- **Follow-up Generator:** Generate email, WhatsApp and LinkedIn follow-up message templates.
- **Reports and Analytics:** View lead totals, pipeline breakdown and conversion rate.
- **Account Settings:** View account information and manage sessions.
- **Responsive Interface:** Dashboard layout designed for desktop and mobile screens.

## Technology Stack

- HTML5
- CSS3
- JavaScript
- Supabase Authentication
- Supabase PostgreSQL Database
- GitHub Pages

## Database Structure

RevenueForge uses a Supabase `leads` table with these fields:

| Field | Purpose |
|---|---|
| `id` | Lead identifier |
| `user_id` | Owner of the lead |
| `name` | Prospect's name |
| `email` | Prospect's email |
| `service` | Service or business interest |
| `status` | New, Contacted or Converted |
| `created_at` | Record creation timestamp |

Row Level Security (RLS) policies restrict users to their own lead records.

## Local Setup

1. Clone or download this repository.
2. Create a Supabase project.
3. Configure the required `leads` table and RLS policies.
4. Open `supabase-config.js`.
5. Add your Supabase project URL and publishable key.
6. Open `index.html` through a local web server or deploy the project using GitHub Pages.

Example configuration:

```javascript
window.REVENUEFORGE_SUPABASE_URL = "[YOUR_SUPABASE_PROJECT_URL](https://cussolbbbvlvzptsaxmi.supabase.co)";
window.REVENUEFORGE_SUPABASE_KEY = "sb_publishable_OjIDVXfIuPENkmSk6SW4zA_SIabQvtj";
```

Never place a Supabase service-role key in frontend code.

## Current Limitations

- Follow-up messages are generated from built-in templates; they are not automatically sent.
- Reports currently focus on lead counts and conversion rates.
- No payment processing or automated revenue tracking is implemented.
- No external CRM integrations are currently available.

## Project Purpose

RevenueForge demonstrates practical frontend development, database integration, authentication, CRUD operations and dashboard reporting.

## Author

**Tuquash**

- GitHub: https://github.com/Tuquash
