# GroupGlow Chatter - Setup Guide

## Prerequisites

- **Node.js** 18+ or **Bun** 1.3+
- **Git**
- **Supabase Account** (Free tier available)

## Installation Steps

### 1. Clone Repository
```bash
git clone <repo-url>
cd groupglow-chatter-main
```

### 2. Install Dependencies
```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### 3. Setup Environment Variables

```bash
# Copy .env.example to .env.local
cp .env.example .env.local
```

Then edit `.env.local` with your configuration:

```env
# Supabase Setup
# 1. Go to https://app.supabase.com
# 2. Create a new project or use existing one
# 3. Copy Project URL and Anon Key from Settings > API

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Setup Supabase Database

The database schema is managed via Supabase migrations. Run:

```bash
# Create tables (done automatically or run migration)
# Tables created: profiles, groups, group_members, messages, typing_indicators, read_receipts
```

**Required tables:**
- `profiles` - User profiles
- `groups` - Group metadata
- `group_members` - Group membership
- `messages` - Chat messages
- `typing_indicators` - Real-time typing status
- `read_receipts` - Message read tracking

### 5. Configure Supabase Storage

1. Go to **Storage** in Supabase dashboard
2. Create bucket: `message-files` (public)
3. Add policies:
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow user uploads" ON storage.objects
   FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   
   -- Allow public read
   CREATE POLICY "Allow public read" ON storage.objects
   FOR SELECT USING (true);
   ```

### 6. Run Development Server

```bash
# Using Bun
bun run dev

# Or using npm
npm run dev
```

Server will start at: `http://localhost:8080`

## Project Structure

```
src/
├── components/        # React components
│   ├── chat/         # Chat-specific components
│   └── ui/           # Reusable UI components (Radix UI)
├── hooks/            # Custom React hooks
├── integrations/
│   └── supabase/     # Supabase client & auth
├── lib/              # Utilities (i18n, utils, error handling)
├── routes/           # TanStack Router routes
├── styles.css        # Global styles (Tailwind)
├── router.tsx        # Router configuration
└── start.tsx         # Entry point
```

## Development Commands

```bash
# Start dev server
bun run dev

# Build for production
bun run build

# Build for development (with debugging)
bun run build:dev

# Preview production build
bun run preview

# Lint code
bun run lint

# Format code
bun run format
```

## Testing

```bash
# Run unit tests
bun run test

# Run tests with coverage
bun run test:coverage

# Watch mode
bun run test:watch
```

## Deployment

### Deploy to Cloudflare Pages

```bash
# Install Wrangler
bun add -D wrangler

# Configure wrangler.jsonc with your account details

# Deploy
bun run build
bunx wrangler pages deploy dist
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Required |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | Required |
| `VITE_API_BASE_URL` | API base URL | http://localhost:5173 |
| `VITE_MAX_FILE_UPLOAD_SIZE` | Max upload size (bytes) | 10485760 (10MB) |
| `VITE_MESSAGE_PAGINATION_SIZE` | Messages per page | 50 |
| `VITE_ENABLE_VOICE_CALLS` | Enable voice calling | false |
| `VITE_ENABLE_VIDEO_CALLS` | Enable video calling | false |

## Troubleshooting

### Supabase Connection Error
```
Error: Failed to connect to Supabase
```
- Check if `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- Ensure Supabase project is active

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Or specify different port
bun run dev -- --port 3000
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules
bun install
bun run build
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m "feat: add feature"`
3. Push to branch: `git push origin feature/my-feature`
4. Open pull request

## Tech Stack

- **Frontend**: React 19, TypeScript, TanStack Router
- **Database**: Supabase (PostgreSQL)
- **UI**: Radix UI, Tailwind CSS
- **Build**: Vite, Cloudflare Workers
- **Testing**: Vitest, React Testing Library
- **Styling**: Tailwind CSS 4, CVA

## Support

For issues and questions, please open an issue on GitHub.

## License

MIT
