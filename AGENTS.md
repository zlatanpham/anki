# Repository Guidelines

## Project Structure & Module Organization

The Next.js app lives in `src/app`, split into `(public)` and `(protected)` route groups and `api` handlers. Shared UI is under `src/components` (with shadcn/ui parts in `src/components/ui`). Server logic is concentrated in `src/server` and `src/trpc`, while reusable helpers stay in `src/lib` and hooks in `src/hooks`. Database schema, migrations, and seed scripts are in `prisma/`, and Playwright specs sit alongside feature code in `src/__tests__`. Static assets belong in `public/` and marketing docs in `docs/` and `assets/`.

## Build, Test, and Development Commands

Use `pnpm dev` to run the Turbo dev server on port 3006. `pnpm build` creates a production bundle, and `pnpm preview` runs the optimized build locally. Database helpers include `./start-database.sh` to spin up Postgres via Docker and `pnpm db:generate` for Prisma migrations. Before shipping, run `pnpm check` to lint and type-check in one pass.

## Coding Style & Naming Conventions

Stick to TypeScript with React Server Components where possible. Follow Prettier defaults (2-space indentation) enforced by `pnpm format:write`, and let `eslint --fix` handle stylistic rules such as inline type-only imports. Name React components in `PascalCase`, hooks in `camelCase` prefixed with `use`, and files that export a default component as `component-name.tsx`. Tailwind class sorting is automatic through the Prettier Tailwind plugin; avoid manual reordering.

## Testing Guidelines

End-to-end flows use Playwright: `pnpm test` for the full suite or `pnpm test:ui` when iterating. Unit and integration tests live in `src/__tests__` and run with `pnpm test:unit`. Aim to cover new logic paths and include regression tests for reported bugs; use `pnpm test:unit:coverage` before larger refactors to monitor impact. Prefer descriptive `feature.behavior.test.ts` filenames.

## Commit & Pull Request Guidelines

Commits follow Conventional Commit types (`feat`, `fix`, `docs`, etc.) and short, imperative subjects under 100 characters; `pnpm lint-staged` and Husky will enforce formatting on commit. For pull requests, describe the problem, the solution, and testing evidence (command output or screenshots for UI). Link relevant issues and flag schema changes that require `pnpm db:migrate`.

## Environment & Configuration Tips

Copy `.env.example` to `.env` and keep secrets out of version control. During local work run `./start-database.sh` and update Prisma models in `prisma/schema.prisma`, then `pnpm db:push` to sync. Regenerate shadcn components with `pnpm ui:add` instead of hand-editing shared UI primitives to preserve consistency.
