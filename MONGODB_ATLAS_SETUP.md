# 🗄️ MongoDB Atlas Setup Guide

## Quick Start

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up with Google, GitHub, or email
3. Create an organization and project

### Step 2: Create a Cluster
1. Click **"Create a Deployment"**
2. Choose **"Cloud"** and select your tier (M0 Free Tier is perfect for testing)
3. Select your cloud provider (AWS, Azure, or Google Cloud)
4. Choose the closest region to you
5. Name your cluster (e.g., "partymix-cluster")
6. Click **"Create Deployment"**

### Step 3: Create Database User
1. Go to **"Database Access"** in the left sidebar
2. Click **"Add Database User"**
3. Set:
   - **Username**: Your database user (e.g., `partymix_user`)
   - **Password**: Strong password (or auto-generate)
   - **User Privileges**: Select **"Built-in Role"** → **"Atlas Admin"**
4. Click **"Add User"**
5. **⚠️ Save the password** - you'll need it later!

### Step 4: Configure Network Access
1. Go to **"Network Access"** in the left sidebar
2. Click **"Add IP Address"**
3. Choose **"Allow Access from Anywhere"** (0.0.0.0/0) for development
   - ⚠️ **For production**: Whitelist only your server's IP
4. Click **"Confirm"**

### Step 5: Get Connection String
1. Go to your **Cluster** dashboard
2. Click **"Connect"** button
3. Choose **"Connect your application"**
4. Select **"Node.js"** and version **"4.x or later"**
5. Copy the connection string

### Step 6: Add to Environment Variables

**Backend folder** - Create `.env` file:
```bash
MONGODB_URI=mongodb+srv://partymix_user:YOUR_PASSWORD@your-cluster.mongodb.net/partymix?retryWrites=true&w=majority
PORT=3001
NODE_ENV=development
```

Replace:
- `YOUR_PASSWORD` with your database password
- `your-cluster` with your actual cluster name (from the connection string)

### Step 7: Test Connection
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB connected
🚀 Server running on http://localhost:3001
```

## Database Seeding

After connecting successfully:

```bash
npm run seed
```

This will:
- Create collections for Challenges, Cards, Positions, and Dice
- Populate with game data
- Set up indexes for optimal performance

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Environment type | `development` or `production` |

## Connection String Format

```
mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]?retryWrites=true&w=majority
```

- **[username]**: Your database user (created in Step 3)
- **[password]**: Your database password (created in Step 3)
- **[cluster]**: Your cluster name (e.g., `cluster0.xxxxx`)
- **[database]**: Database name (usually `partymix`)

## Troubleshooting

### ❌ "Authentication failed"
- Check username and password in `.env`
- Make sure password has no special URL characters (if so, encode them)
- Verify user exists in "Database Access"

### ❌ "IP not whitelisted"
- Go to "Network Access"
- Add your current IP address
- Or use 0.0.0.0/0 (allow anywhere)

### ❌ "Connection timeout"
- Check your internet connection
- Verify MongoDB Atlas is not under maintenance
- Try a different region cluster

### ❌ "Certificate error"
- Update Node.js to latest LTS version
- Or add to connection string: `?tlsInsecure=true` (⚠️ development only!)

## Security Best Practices

✅ **DO:**
- Use strong passwords
- Rotate credentials regularly
- Store `.env` in `.gitignore`
- Use environment variables in production

❌ **DON'T:**
- Commit `.env` to version control
- Use 0.0.0.0/0 in production
- Share connection strings
- Use weak passwords

## Switching Between Local and Atlas

**Use Atlas (cloud):**
```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/partymix?retryWrites=true&w=majority
```

**Use Local MongoDB:**
```bash
MONGODB_URI=mongodb://localhost:27017/partymix
```

Make sure local MongoDB is running:
```bash
mongod
```

## Production Deployment

For production (Heroku, Vercel, etc.):

1. Create a dedicated database user for production
2. Whitelist only your server's IP in Network Access
3. Use a strong, randomly-generated password
4. Set `NODE_ENV=production` in environment variables
5. Consider using IP allowlisting instead of 0.0.0.0/0
6. Enable database encryption at rest
7. Regular backups

## Need Help?

- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Connection Troubleshooting](https://www.mongodb.com/docs/atlas/troubleshoot-connection/)
- [Security Best Practices](https://www.mongodb.com/docs/atlas/security/)
