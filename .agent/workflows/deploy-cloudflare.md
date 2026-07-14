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
   ```

2. **Run a Dry Run Build**
   Verify the esbuild bundle compilation starts:
   ```bash
   npx wrangler deploy --dry-run
   ```

3. **Deploy to Cloudflare Workers**
   Run the deployment script:
   ```bash
   npm run deploy
   ```
