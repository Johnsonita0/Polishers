# Polishers

## Newsletter setup

The public newsletter popup opens after five seconds, can be reopened from the site footer, and posts to the Vercel serverless endpoint at `/api/newsletter`. The endpoint stores each normalized email in Supabase; when configured, it also adds the subscriber to a Resend Segment and sends welcome and admin notification emails. Admins can view collected subscribers, save campaign drafts, preview emails, send immediately, or schedule delivery for a selected local date and time. Scheduled campaigns can be canceled back to drafts from `/admin/newsletter`.

Configure these environment variables in Vercel for Production and Preview:

- `RESEND_API_KEY`: private Resend API key. Keep this server-side; do not prefix it with `VITE_`. Required for email delivery and campaign sending.
- `RESEND_SEGMENT_ID`: ID of the Resend Segment used for campaign broadcasts. Resend has replaced Audiences with Segments.
- `RESEND_FROM_EMAIL`: sender address on a domain verified with Resend, for example `Polishers Da Elite <newsletter@yourdomain.com>`. Required for welcome emails and campaign sending.
- `NEWSLETTER_ADMIN_EMAIL`: optional address that receives new-subscriber notifications.
- `SITE_URL`: canonical site URL used for email links and the logo.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: required by the admin serverless API to verify the signed-in administrator. These are also used by the browser app; never put a Supabase service-role key in the frontend.
- `VITE_INSTAGRAM_URL`: optional public Instagram profile URL used in the site and email footers.
- `VITE_FACEBOOK_URL`: optional public Facebook profile URL used in the site and email footers.
- `VITE_LINKEDIN_URL`: optional public LinkedIn company page used in the site and email footers.

Run the latest `supabase-schema.sql` to create the subscriber and campaign tables, signup RPC, and newsletter image bucket. Newsletter signups require `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; the subscriber list is kept in Supabase independently of Resend. Create a Resend Segment and set its ID as `RESEND_SEGMENT_ID` to sync new signups and enable campaign sending. Copy `.env.example` as a reference when configuring the project, set real values in the Vercel project settings, then redeploy. The Resend sender domain must be verified before email delivery will work. Social icons are visible in the footer; set the profile URL variables to activate their links.