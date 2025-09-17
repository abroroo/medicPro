# MedicPro - Local Development Setup

A comprehensive dental clinic management system with patient database, queue management, and reporting features.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database (we use Neon for cloud hosting)

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd medicPro
npm install
```

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```bash
# Your Neon PostgreSQL connection string
DATABASE_URL=postgresql://user:pass@host:port/database?sslmode=require

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=your-64-char-hex-secret-key

# Development settings
NODE_ENV=development
PORT=5001
```

### 3. Database Setup
```bash
# Generate migration files (if schema changed)
npm run db:generate

# Apply schema to database
npm run db:push

# Optional: Open database studio
npm run db:studio
```

### 4. Start Development Servers
```bash
# Start both client and server together
npm run dev:local

# Or start them separately:
npm run dev:server  # Express API server on :5001
npm run dev:client  # Vite dev server on :3000
```

### 5. Access Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:5001/api
- **Database Studio**: http://localhost:4983 (if running db:studio)

## 📁 Project Structure

```
medicPro/
├── client/          # React frontend application
│   ├── src/         # React components and pages
│   └── public/      # Static assets
├── server/          # Express.js backend
│   ├── index.ts     # Server entry point
│   ├── auth.ts      # Authentication setup
│   ├── config.ts    # Environment configuration
│   └── routes.ts    # API routes
├── shared/          # Shared TypeScript types
│   └── schema.ts    # Database schema definitions
├── migrations/      # Database migration files
└── .env.local       # Environment variables (local)
```

## 🛠️ Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:local` | Start both client and server for local development |
| `npm run dev:server` | Start only the Express API server |
| `npm run dev:client` | Start only the Vite development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate new database migrations |
| `npm run db:push` | Apply schema changes to database |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |
| `npm run check` | Run TypeScript type checking |

## 🔧 Configuration

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secure random string for session encryption

**Optional:**
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5001 for local, 5000 for production)

### Database Configuration
The app uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL. Schema is defined in `shared/schema.ts`.

### Authentication
- Uses Passport.js with local strategy
- Sessions stored in PostgreSQL
- Passwords hashed with Node.js crypto.scrypt

## 🚢 Deployment Options

### Vercel (Recommended for Frontend)
```bash
# Deploy to Vercel
npx vercel --prod
```
Set environment variables in Vercel dashboard.

### Render (Recommended for Full-Stack)
```bash
# Deploy to Render using render.yaml configuration
# Set up database and environment variables in Render dashboard
```

### Docker
```bash
# Build Docker image
docker build -t medicpro .

# Run container
docker run -p 5000:5000 --env-file .env.local medicpro
```

## 🔍 Features

### Patient Management
- ✅ Patient registration and profiles
- ✅ Medical history tracking
- ✅ Search and filtering
- ✅ **Click patient rows to view details** (recently added)

### Reports & Analytics
- ✅ Patient statistics
- ✅ **Fixed visit history tab rendering** (recently fixed)
- ✅ Filtered visit reports
- ✅ CSV export functionality
- ✅ Print-friendly reports

### Queue Management
- ✅ Daily patient queue
- ✅ Real-time status updates
- ✅ Waiting room display

### Authentication & Security
- ✅ User registration/login
- ✅ Session-based authentication
- ✅ Protected routes
- ✅ Secure password hashing

## 🐛 Troubleshooting

### Port Already in Use
If port 5001 is busy, change `PORT` in `.env.local`:
```bash
PORT=5002  # Or any available port
```

### Database Connection Issues
1. Verify your `DATABASE_URL` is correct
2. Check if your IP is whitelisted (for cloud databases)
3. Test connection: `npm run db:studio`

### Build Issues
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Check TypeScript: `npm run check`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test locally: `npm run dev:local`
5. Commit and push changes
6. Create a Pull Request

## 📝 Recent Updates

- ✅ **Fixed visit history tab Select validation errors**
- ✅ **Added patient row navigation to detail pages**
- ✅ **Local development setup with Neon database**
- ✅ **Environment configuration for multiple deployment targets**
- ✅ **Preserved Replit compatibility for future use**

---

Need help? Check the issues page or contact the development team!