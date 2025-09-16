# Anki Flashcards

A modern Anki-inspired flashcard application built with Next.js 15, featuring spaced repetition learning, multi-tenant organizations, and modern tooling.

![](assets/desktop.webp)

![](assets/mobile.webp)

## Features

### Flashcard Learning

- **Spaced Repetition**: Optimized learning intervals based on memory science
- **Card Management**: Create, edit, and organize flashcards in decks
- **Study Sessions**: Interactive learning with progress tracking
- **Multi-format Cards**: Support for text, images, and rich content

### Platform Features

- **Authentication**: GitHub OAuth + Email/Password with NextAuth.js
- **Multi-tenant**: Organization-based deck sharing and collaboration
- **Modern UI**: Responsive design with shadcn/ui components
- **Type Safety**: End-to-end TypeScript with tRPC APIs
- **Real-time Sync**: Instant updates across devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, NextAuth.js, Prisma
- **Database**: PostgreSQL
- **UI Components**: shadcn/ui, Radix UI
- **Email**: Resend
- **Dev Tools**: ESLint, Prettier, TypeScript

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- Docker (for PostgreSQL)
- Git

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd anki
pnpm install
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myapp"

# NextAuth
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# GitHub OAuth (optional)
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# Email (optional)
RESEND_API_KEY="your-resend-api-key"
EMAIL_FROM="noreply@yourdomain.com"
```

### 3. Database Setup

Start PostgreSQL using Docker:

```bash
./start-database.sh
```

Run database migrations:

```bash
pnpm run db:generate
```

### 4. Start Development

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development Commands

### Database

- `./start-database.sh` - Start PostgreSQL with Docker
- `pnpm run db:generate` - Run Prisma migrations in development
- `pnpm run db:migrate` - Deploy Prisma migrations to production
- `pnpm run db:push` - Push schema changes to database
- `pnpm run db:studio` - Open Prisma Studio

### Development

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run preview` - Build and start production server

### Code Quality

- `pnpm run lint` - Run ESLint
- `pnpm run lint:fix` - Run ESLint with auto-fix
- `pnpm run typecheck` - Run TypeScript type checking
- `pnpm run check` - Run both linting and type checking
- `pnpm run format:check` - Check code formatting
- `pnpm run format:write` - Format code with Prettier

### UI Components

- `pnpm run ui:add` - Add new shadcn/ui components

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (public)/          # Public routes (login, signup)
│   ├── (protected)/       # Protected routes (dashboard, account)
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Custom components
├── lib/                  # Utility functions
├── server/               # Server-side code
│   ├── api/              # tRPC routers
│   ├── auth/             # NextAuth configuration
│   └── db.ts             # Database client
└── styles/               # Global styles
```

## Database Schema

The application includes schemas for flashcard learning and multi-tenant organizations:

### Authentication & Users

- **User**: User accounts with email/password and OAuth support
- **Account**: OAuth account connections (NextAuth)
- **Session**: User sessions (NextAuth)
- **VerificationToken**: Email verification tokens (NextAuth)

### Organizations & Sharing

- **Organization**: Multi-tenant containers for shared decks and collaboration
- **OrganizationMember**: Organization membership with role management

### Flashcard System

- **Deck**: Collections of flashcards organized by topic
- **Card**: Individual flashcards with front/back content
- **Study Session**: Learning sessions with progress tracking
- **Card Reviews**: Spaced repetition algorithm data and performance metrics

## Authentication Flow

### Email/Password

1. Sign up with email and password
2. Password reset via email (using Resend)
3. Account management

### GitHub OAuth

1. Configure GitHub OAuth app
2. Add credentials to `.env`
3. One-click sign-in/sign-up

## Customization

### Adding New Features

1. **Study Modes**: Extend study sessions with new learning algorithms
2. **Card Types**: Add support for cloze deletion, multiple choice, etc.
3. **Analytics**: Implement learning progress and performance tracking
4. **Import/Export**: Add Anki deck compatibility or CSV support

### Extending Database Schema

1. Modify `prisma/schema.prisma` to add new entities
2. Run `pnpm run db:generate` to apply changes
3. Create corresponding tRPC routers in `src/server/api/routers/`

### Adding UI Components

```bash
pnpm run ui:add button
pnpm run ui:add form
pnpm run ui:add card
```

### Customizing Learning Algorithm

- Modify spaced repetition intervals in learning logic
- Implement different SRS algorithms (SM-2, SM-17, etc.)
- Add difficulty adjustments based on user performance

## Deployment

### Environment Variables

Ensure all production environment variables are set:

- `DATABASE_URL` - Production PostgreSQL connection
- `AUTH_SECRET` - Strong random secret
- `NEXTAUTH_URL` - Your production domain
- OAuth credentials (if using)
- `RESEND_API_KEY` and `EMAIL_FROM` (for emails)

### Database Migration

```bash
pnpm run db:migrate
```

### Build and Deploy

```bash
pnpm run build
pnpm run start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm run check` to ensure code quality
5. Submit a pull request

## License

[MIT License](LICENSE.md)
