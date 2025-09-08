import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors (client errors)
          if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch when window regains focus for study-related data
        refetchOnWindowFocus: (query) => {
          const queryKey = query.queryKey;
          // Refetch study-related queries when window regains focus
          if (
            queryKey.includes("study") ||
            queryKey.includes("review") ||
            queryKey.includes("due")
          ) {
            return true;
          }
          return false;
        },
      },
      mutations: {
        // Retry mutations once on network error
        retry: (failureCount, error: any) => {
          if (error?.data?.httpStatus >= 400 && error?.data?.httpStatus < 500) {
            return false;
          }
          return failureCount < 1;
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
