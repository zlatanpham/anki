import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
import { organizationRouter } from "./routers/organization";
import { userRouter } from "./routers/user";
import { deckRouter } from "./routers/deck";
import { cardRouter } from "./routers/card";
import { studyRouter } from "./routers/study";
import { importRouter } from "./routers/import";

export const appRouter = createTRPCRouter({
  organization: organizationRouter,
  user: userRouter,
  deck: deckRouter,
  card: cardRouter,
  study: studyRouter,
  import: importRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
