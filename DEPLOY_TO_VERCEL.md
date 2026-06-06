# Deploy to Vercel — Quick Guide

Steps to connect this repository to Vercel and enable CI/CD:

1. Push this repository to GitHub (do not share personal tokens here).

2. On Vercel dashboard → Import Project → Select "Import Git Repository" → choose `logikaistudio/zavera`.

3. Set the build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. (Optional) Use Git Integration: Vercel can auto-deploy on push. No extra secrets required if you grant Vercel GitHub App access.

5. Alternatively, configure GitHub Actions deploy (already included):
   - Go to GitHub Repo → Settings → Secrets → Actions
   - Add the following secrets:
     - `VERCEL_TOKEN` — create from Vercel (Account Settings → Tokens)
     - `VERCEL_ORG_ID` — find in Vercel project settings
     - `VERCEL_PROJECT_ID` — find in Vercel project settings
   - On push to `main`, `.github/workflows/deploy-vercel.yml` will trigger and deploy.

6. After deployment, verify the site URL from Vercel dashboard.

Security note: If you accidentally exposed a GitHub token, revoke it immediately at https://github.com/settings/tokens.
