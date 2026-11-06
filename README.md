# Polishers

## Newsletter setup

The public newsletter popup opens after five seconds, can be reopened from the site footer, and posts to the Vercel serverless endpoint at `/api/newsletter`. The endpoint adds subscribers to a Resend Segment and sends a branded welcome email to the subscriber plus a new-subscriber notification to the admin address. Admins can save campaign drafts, upload images, preview the email, and send a campaign to the Segment from `/admin/newsletter`.

Configure these environment variables in Vercel for Production and Preview:

- `RESEND_API_KEY`: private Resend API key. Keep this server-side; do not prefix it with `VITE_`.
- `RESEND_SEGMENT_ID`: ID of the Resend Segment used for newsletter subscribers and broadcasts. Resend has replaced Audiences with Segments.
- `RESEND_FROM_EMAIL`: sender address on a domain verified with Resend, for example `Polishers Da Elite <newsletter@yourdomain.com>`.
- `NEWSLETTER_ADMIN_EMAIL`: address that receives new-subscriber notifications.
- `SITE_URL`: canonical site URL used for email links and the logo.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`: required by the admin serverless API to verify the signed-in administrator. These are also used by the browser app; never put a Supabase service-role key in the frontend.
- `VITE_INSTAGRAM_URL`: optional public Instagram profile URL used in the site and email footers.
- `VITE_FACEBOOK_URL`: optional public Facebook profile URL used in the site and email footers.
- `VITE_LINKEDIN_URL`: optional public LinkedIn company page used in the site and email footers.

Run the latest `supabase-schema.sql` to create the campaign table and newsletter image bucket. Create a Resend Segment and set its ID as `RESEND_SEGMENT_ID`. Copy `.env.example` as a reference when configuring the project, set real values in the Vercel project settings, then redeploy. The Resend sender domain must be verified before email delivery will work. Social icons are visible in the footer; set the profile URL variables to activate their links.