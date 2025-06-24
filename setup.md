# GuardTrack Setup Guide

## Prerequisites

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **PostgreSQL Database** - Use [Neon Database](https://neon.tech) (recommended) or local PostgreSQL
3. **Git** - [Download here](https://git-scm.com/)

## Quick Setup

### 1. Clone and Install
```bash
git clone https://github.com/FELMONON/GuardTrack.git
cd GuardTrack
npm install
```

### 2. Environment Configuration

⚠️ **IMPORTANT**: You must set up your database connection before running the application.

Create your environment variables (DATABASE_URL is required):

**Option A: Using Neon Database (Recommended - Free Tier Available)**
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string from the dashboard
4. Set the environment variable:

```bash
# macOS/Linux
export DATABASE_URL="postgresql://username:password@ep-example-12345.us-east-1.aws.neon.tech/guardtrack?sslmode=require"

# Windows (Command Prompt)
set DATABASE_URL=postgresql://username:password@ep-example-12345.us-east-1.aws.neon.tech/guardtrack?sslmode=require

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://username:password@ep-example-12345.us-east-1.aws.neon.tech/guardtrack?sslmode=require"
```

**Option B: Local PostgreSQL**
1. Install PostgreSQL locally
2. Create a database named `guardtrack`
3. Set the environment variable:

```bash
export DATABASE_URL="postgresql://localhost:5432/guardtrack"
```

### 3. Database Setup
```bash
# Push the database schema
npm run db:push

# Initialize default patrol sites (optional)
curl -X POST http://localhost:5000/api/init-sites
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## Production Deployment

### 1. Build the Application
```bash
npm run build
```

### 2. Start Production Server
```bash
DATABASE_URL="your-production-database-url" npm start
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NODE_ENV` | Environment mode | No | development |
| `PORT` | Server port | No | 5000 |

## Troubleshooting

### Database Connection Issues
- Ensure your DATABASE_URL is correctly formatted
- For Neon: Make sure to include `?sslmode=require`
- For local PostgreSQL: Ensure the database exists and is running

### Port Issues
- If port 5000 is busy, the app will fail to start
- Kill any process using port 5000: `lsof -ti:5000 | xargs kill`

### Build Issues
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Ensure you're using Node.js 18 or higher: `node --version`
- If you see TypeScript errors, run: `npm run check` to verify they're resolved
- For "Property 'distance' does not exist" errors: These have been fixed in the latest version

## API Testing

Test the API endpoints:

```bash
# Get patrol sites
curl http://localhost:5000/api/patrol-sites

# Create a patrol site
curl -X POST http://localhost:5000/api/patrol-sites \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Site","address":"123 Test St","latitude":"51.0447","longitude":"-114.0719","geofenceRadius":60}'

# Start a patrol session
curl -X POST http://localhost:5000/api/patrol-action \
  -H "Content-Type: application/json" \
  -d '{"siteId":1,"deviceId":"test-device","action":"enter","latitude":51.0447,"longitude":-114.0719,"isWithinGeofence":true}'
```

## Support

If you encounter issues:
1. Check this setup guide
2. Review the main [README.md](README.md)
3. Open an issue on GitHub: https://github.com/FELMONON/GuardTrack/issues 