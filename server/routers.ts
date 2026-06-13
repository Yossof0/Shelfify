import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  products: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getProductsByUserId(ctx.user.id)
    ),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          price: z.string().regex(/^\d+(\.\d{1,2})?$/),
          tags: z.string().optional(),
          photoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await db.createProduct({
          userId: ctx.user.id,
          name: input.name,
          description: input.description || null,
          price: input.price,
          tags: input.tags || null,
          photoUrl: input.photoUrl || null,
        });
        return result;
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          price: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
          tags: z.string().optional(),
          photoUrl: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return db.updateProduct(id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteProduct(input.id);
      }),

    deleteAll: protectedProcedure.mutation(async ({ ctx }) => {
      return db.deleteAllProductsByUserId(ctx.user.id);
    }),
  }),

  purchases: router({
    list: protectedProcedure.query(({ ctx }) =>
      db.getPurchasesByUserId(ctx.user.id)
    ),

    create: protectedProcedure
      .input(
        z.object({
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number().min(1),
              priceAtPurchase: z.string(),
            })
          ),
          totalAmount: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Create purchase record
        const purchaseResult = await db.createPurchase({
          userId: ctx.user.id,
          totalAmount: input.totalAmount,
        });

        // Get the inserted purchase ID (from drizzle result)
        const purchaseId = (purchaseResult as any).insertId || Date.now();

        // Create purchase items
        for (const item of input.items) {
          await db.createPurchaseItem({
            purchaseId: purchaseId,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: item.priceAtPurchase,
          });
        }

        return {
          id: purchaseId,
          ...input,
        };
      }),

    getWithItems: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPurchaseWithItems(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;

// Helper to get product with tags parsed
export async function getProductsWithParsedTags(userId: number) {
  const products = await db.getProductsByUserId(userId);
  return products.map(p => ({
    ...p,
    tags: p.tags ? JSON.parse(p.tags) : [],
  }));
}
