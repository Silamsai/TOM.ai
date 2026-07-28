---
description: Deploy the backend application to Cloudflare Workers
---
Follow these steps to deploy the TOM.ai backend server to Cloudflare:

1. **Configure Environment Secrets**
   Set the required Cloudflare Workers environments secrets using Wrangler:
   ```bash
   npx wrangler secret put MONGODB_URI
   npx wrangler secret put JWT_SECRET
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SENDGRID_API_KEY
   npx wrangler secret put RESEND_API_KEY
   ```

   Optional but commonly useful vars:
   ```bash
   npx wrangler secret put RESEND_FROM
   ```

2. **Set Worker vars**
   `backend/wrangler.toml` already defines `DB_NAME`. Make sure your Worker environment also has any needed non-secret vars such as:
   - `FRONTEND_URL`
   - `GOOGLE_SIGNIN_REDIRECT_URI`
   - `GOOGLE_CONNECT_REDIRECT_URI`

3. **Run a Dry Run Build**
   Verify the esbuild bundle compilation starts:
   ```bash
   npx wrangler deploy --dry-run
   ```

4. **Deploy to Cloudflare Workers**
   Run the deployment script:
   ```bash
   npm run deploy
   ```
