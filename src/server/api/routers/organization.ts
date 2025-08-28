import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const organizationRouter = createTRPCRouter({
  getOwnedOrganization: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    
    try {
      const organization = await ctx.db.organization.findFirst({
        where: {
          owner_user_id: userId,
        },
        select: {
          id: true,
          name: true,
        },
      });
      
      return organization;
    } catch (error) {
      console.error('[Organization] Failed to fetch owned organization:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch organization'
      });
    }
  }),
});
