# 🚀 PartyMix Deployment Guide

Complete guide for setting up and deploying PartyMix with MongoDB Atlas to the cloud.

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Cloud Deployment](#cloud-deployment)
4. [Mobile Access](#mobile-access)
5. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Node.js v16+ ([download](https://nodejs.org/))
- MongoDB Atlas account ([signup](https://www.mongodb.com/cloud/atlas))
- Git

### Step 1: Clone & Install Dependencies

```bash
cd partymix
npm run install:all
```

### Step 2: Configure Environment Variables

**Backend** - Create `.env`:
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your MongoDB Atlas connection string:
```bash
MONGODB_URI=mongodb+srv://username:password@your-cluster.mongodb.net/partymix?retryWrites=true&w=majority
PORT=3001
NODE_ENV=development
```

### Step 3: Seed Database

```bash
npm run seed
```

### Step 4: Start Development Servers

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# Output: ✅ MongoDB connected
#         🚀 Server running on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# Output: VITE v5.1.0  ready in 123 ms
#         ➜  Local:   http://localhost:5173/
```

Visit http://localhost:5173 in your browser.

---

## MongoDB Atlas Setup

See [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md) for detailed instructions.

**Quick Checklist:**
- [ ] Create MongoDB Atlas account
- [ ] Create a cluster (M0 Free Tier recommended)
- [ ] Create database user
- [ ] Configure network access (0.0.0.0/0 for dev)
- [ ] Copy connection string to `.env`
- [ ] Run `npm run seed` to populate data

---

## Cloud Deployment

### Option 1: Render.com (Recommended - Easy & Free)

#### Backend Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Render Service**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Configure:
     - **Name**: `partymix-backend`
     - **Environment**: `Node`
     - **Build Command**: `cd backend && npm install`
     - **Start Command**: `cd backend && npm run start`
     - **Environment Variables**:
       - `MONGODB_URI`: Your Atlas connection string
       - `NODE_ENV`: `production`
     - **Plan**: Free

3. **Deploy**
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Copy your backend URL: `https://partymix-backend-xxx.onrender.com`

#### Frontend Deployment

1. **Update API Configuration**

   Edit `frontend/src/utils/api.js`:
   ```javascript
   const BASE = process.env.VITE_API_BASE || '/api'
   ```

   Create `frontend/.env.production`:
   ```
   VITE_API_BASE=https://partymix-backend-xxx.onrender.com/api
   ```

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Connect GitHub repo
   - Configure:
     - **Base directory**: `frontend`
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
     - **Environment Variables**: (from `.env.production`)
   - Click "Deploy site"

3. **Configure Redirect**
   Create `frontend/public/_redirects`:
   ```
   /* /index.html 200
   ```

### Option 2: Vercel (Easy, Paid for Serverless)

1. **Deploy Frontend**
   ```bash
   npm install -g vercel
   cd frontend
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard
   - Project Settings → Environment Variables
   - Add: `VITE_API_BASE=your-backend-url`

3. **Redeploy**: `vercel --prod`

### Option 3: Heroku (Legacy - No Free Tier)

Heroku removed free tier. Use Render.com instead.

---

## Mobile Access

### Method 1: Wi-Fi Network (Easiest)

1. **Backend & Frontend must be on same network**
   - Connected to same Wi-Fi

2. **Find your PC's local IP**
   ```bash
   # Windows PowerShell
   ipconfig
   # Look for "IPv4 Address" like 192.168.1.100
   
   # Mac/Linux
   ifconfig
   ```

3. **Update Vite config** (if not already configured with `host: true`)
   ```javascript
   // frontend/vite.config.js
   export default defineConfig({
     server: {
       host: true, // Listen on all interfaces
       port: 5173,
       proxy: {
         '/api': { target: 'http://localhost:3001', changeOrigin: true }
       }
     }
   })
   ```

4. **Start dev servers**
   ```bash
   npm run dev:frontend
   npm run dev:backend
   ```

5. **On mobile phone**
   - Open browser
   - Go to: `http://192.168.1.100:5173` (use your actual IP)
   - Play!

### Method 2: PWA (Install as App)

1. **Create `frontend/public/manifest.json`**:
   ```json
   {
     "name": "PartyMix",
     "short_name": "PartyMix",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#0f172a",
     "theme_color": "#7c3aed",
     "icons": [
       {
         "src": "/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       }
     ]
   }
   ```

2. **Register Service Worker** in `frontend/src/main.jsx`:
   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js')
   }
   ```

3. **Create `frontend/public/sw.js`** (basic service worker)
   ```javascript
   self.addEventListener('install', (e) => {
     e.waitUntil(self.skipWaiting())
   })
   ```

4. **On mobile**: Open → Menu → "Install app"

### Method 3: ngrok (Internet Share)

For sharing with people outside your network:

1. **Install ngrok**: https://ngrok.com
2. **Create tunnel**:
   ```bash
   ngrok http 5173
   ```
3. **Share the URL**: `https://xxxxx.ngrok.io`

⚠️ **Note**: ngrok gives a new URL every time (free plan)

---

## Database Backup & Management

### Backup Data
```bash
# Export from MongoDB Atlas
# Go to: Cluster → Backup → Download
```

### Monitor Database
- Go to MongoDB Atlas dashboard
- Check "Metrics" for usage stats
- View real-time connections in "Activity"

### Scale Database
- Free M0 cluster: 512 MB storage max
- Upgrade to M2 for 10 GB when needed
- Click "Scale" in cluster settings

---

## Security Checklist

✅ **DO:**
- Use strong database passwords
- Store `.env` in `.gitignore` (never commit!)
- Update MongoDB Atlas network access rules for production
- Use HTTPS everywhere
- Enable two-factor authentication on MongoDB Atlas
- Regular database backups

❌ **DON'T:**
- Commit `.env` files
- Share connection strings
- Use 0.0.0.0/0 network access in production
- Use weak passwords
- Store secrets in code

---

## Environment Variables Reference

### Backend (`.env`)
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/partymix?retryWrites=true&w=majority
PORT=3001
NODE_ENV=development|production
```

### Frontend (`.env.production`)
```bash
VITE_API_BASE=https://your-api-domain.com/api
VITE_APP_NAME=PartyMix
```

---

## Monitoring & Logs

### Backend Logs (Render)
- Go to Render Dashboard
- Select service → Logs tab
- Real-time logs visible

### Database Logs (MongoDB Atlas)
- Go to Cluster → Activity
- View operation logs
- Monitor slow queries

### Frontend Errors (Netlify/Vercel)
- Check browser DevTools Console
- Analytics dashboard available

---

## Performance Optimization

### Frontend
- Built with Vite (fast bundling)
- Uses React Query for caching
- Framer Motion for smooth animations
- Tailwind CSS for optimized styles

### Backend
- Mongoose for query optimization
- MongoDB indexes on common queries
- Connection pooling configured
- CORS optimized for production

### Database
- Free M0 auto-optimizes
- Indexes created automatically
- TTL indexes for data cleanup

---

## Troubleshooting

### ❌ "Cannot connect to MongoDB"
- Check `.env` has correct connection string
- Verify database user exists
- Ensure your IP is whitelisted (Network Access)
- Test connection: `mongosh "your-connection-string"`

### ❌ "CORS error on mobile"
- Backend CORS is configured for `*` in dev
- For production, update in `backend/server.js`:
  ```javascript
  app.use(cors({ origin: 'https://your-frontend-domain.com' }))
  ```

### ❌ "Mobile shows old version"
- Clear cache: Settings → Apps → PartyMix → Clear Cache
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

### ❌ "Database quota exceeded"
- Check Atlas billing
- View storage in Cluster → Metrics
- Delete old test data if needed
- Upgrade to larger cluster tier

### ❌ "Deployment stuck"
- Check logs on Render/Netlify
- Verify build commands are correct
- Ensure `.env` variables are set
- Try manual redeploy

---

## Getting Help

- 📖 [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- 🚀 [Render Deployment Guide](https://render.com/docs)
- 🌐 [Netlify Docs](https://docs.netlify.com/)
- 💬 [Stack Overflow](https://stackoverflow.com) - tag your question

---

## Next Steps

1. ✅ Complete local development setup
2. ✅ Deploy backend to Render
3. ✅ Deploy frontend to Netlify
4. ✅ Test on mobile devices
5. ✅ Monitor performance
6. ✅ Share with friends!

Happy partying! 🎉
