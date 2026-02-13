# Trading Gym - Deployment Guide

This guide will help you deploy Trading Gym to free tier cloud services.

## Architecture

- **Frontend**: Vercel (Free tier)
- **Backend**: Railway (Free tier - 500 hours/month)
- **Database**: Supabase (Free tier - 500MB)

## Step 1: Setup Supabase Database

1. Go to [Supabase](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the schema from `backend/db/schema.sql`
4. Go to **Settings > Database** and copy the connection string (URI)
5. Replace `[YOUR-PASSWORD]` with your database password

## Step 2: Deploy Backend to Railway

1. Go to [Railway](https://railway.app) and sign up with GitHub
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your trading-gym repository
4. Configure the service:
   - Root Directory: `backend`
   - Start Command: `node server.js`

5. Add environment variables in Railway dashboard:
   ```
   DATABASE_URL=your-supabase-connection-string
   JWT_SECRET=generate-a-strong-random-string-here
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   ```

6. Railway will give you a URL like `https://trading-gym-production.up.railway.app`
7. Note this URL for the frontend configuration

## Step 3: Deploy Frontend to Vercel

1. Go to [Vercel](https://vercel.com) and sign up with GitHub
2. Click "New Project" > Import your trading-gym repository
3. Configure:
   - Framework Preset: Create React App
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

4. Add environment variable:
   ```
   REACT_APP_API_URL=https://your-railway-url.up.railway.app/api
   ```

5. Deploy!

## Step 4: Populate Market Data

After deployment, you need to populate the database with historical data:

1. Clone the repo locally if you haven't
2. Create `backend/.env` with your Supabase DATABASE_URL
3. Run the data fetching script:
   ```bash
   cd backend
   node scripts/fetchRealBTCData.js
   ```

This will fetch real BTC historical data from Binance (takes about 30-60 minutes for all timeframes).

For additional assets (ETH, SOL):
```bash
node scripts/fetchMultiAssetData.js --asset=ETH
node scripts/fetchMultiAssetData.js --asset=SOL
```

## Environment Variables Summary

### Backend (Railway)
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `JWT_SECRET` | Random string for JWT signing |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | Your Vercel frontend URL |
| `PORT` | (Auto-set by Railway) |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Your Railway backend URL + `/api` |

## Free Tier Limits

### Vercel (Frontend)
- ✅ 100GB bandwidth/month
- ✅ Unlimited deployments
- ✅ Automatic HTTPS

### Railway (Backend)
- ⚠️ 500 hours/month (about 21 days continuous)
- ✅ 512MB RAM
- ✅ Automatic HTTPS
- 💡 Tip: Service sleeps when inactive, saving hours

### Supabase (Database)
- ✅ 500MB database storage
- ✅ 2GB bandwidth/month
- ✅ Automatic backups
- 💡 Note: Historical data can be large (100MB+ with all timeframes)

## Troubleshooting

### CORS Errors
- Make sure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Include the protocol (https://)

### Database Connection Issues
- Check that your Supabase connection string is correct
- Ensure the password doesn't have special characters that need escaping

### No Market Data
- Run the data fetching script after database setup
- Check the script output for any API rate limit errors

## Monitoring

### Railway
- Dashboard shows logs, metrics, and usage
- Set up alerts for when approaching free tier limits

### Vercel
- Analytics tab shows visitor data
- Check deployment logs for build errors

### Supabase
- Table editor to view data
- Logs for database queries

## Scaling (When Ready)

When you're ready to scale beyond free tier:

1. **Railway**: Upgrade to Pro ($5/month) for always-on service
2. **Supabase**: Upgrade to Pro ($25/month) for more storage
3. **Vercel**: Pro tier ($20/month) for team features

## Pre-Deployment Checklist

Before deploying, run the validation script to verify your environment:

```bash
cd backend
npm run validate-env
```

This checks:
- All required environment variables are set
- `DATABASE_URL` format and connectivity
- Schema tables exist in the database
- Market data is populated
- JWT secret strength

### Manual Checks

- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] `FRONTEND_URL` matches your Vercel deployment URL exactly (including `https://`)
- [ ] Database schema has been applied (`backend/db/schema.sql`)
- [ ] Market data has been fetched (at least BTC)
- [ ] CORS is tested: frontend can reach backend API
- [ ] Health check endpoint responds: `curl https://your-backend-url/health`

## CI/CD

This project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs automatically on pushes and pull requests to `main`:

- **Backend**: Installs dependencies, applies schema to a test Postgres instance, and runs tests
- **Frontend**: Installs dependencies, runs a production build, and runs tests

Deployment to Railway and Vercel happens via their respective GitHub integrations (automatic deploys on push to `main`).

## Support

If you encounter issues:
1. Check Railway/Vercel/Supabase logs
2. Ensure all environment variables are set correctly
3. Test API endpoints directly using curl or Postman
