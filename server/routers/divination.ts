import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { divinationRecords } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { buildDivinationResult, type DivinationInput } from "../divinationEngine";

const questionSchema = z.string().trim().min(2, "请写下至少两个字的问题").max(300, "问题请控制在 300 字以内");
const divinationInput = z.object({
  question: questionSchema,
  numberA: z.number().int().min(1).max(999),
  numberB: z.number().int().min(1).max(999),
  numberC: z.number().int().min(1).max(999),
});

const recordInput = divinationInput.extend({
  ritualNonce: z.string().min(16).max(64),
  recordId: z.number().int().positive().optional(),
  interpretation: z.string().trim().min(20).max(10000),
});

export const divinationRouter = router({
  draw: publicProcedure.input(divinationInput).mutation(async ({ ctx, input }) => {
    const ritualNonce = crypto.randomUUID().replaceAll("-", "");
    const result = buildDivinationResult(input, ritualNonce);
    let recordId: number | undefined;
    if (ctx.user) {
      const db = await getDb();
      if (db) {
        const created = await db.insert(divinationRecords).values({
          userId: ctx.user.id,
          question: input.question,
          numberA: input.numberA,
          numberB: input.numberB,
          numberC: input.numberC,
          ritualNonce,
          seedFingerprint: result.seedFingerprint,
          cardsJson: JSON.stringify(result.cards),
          plumJson: JSON.stringify(result.plum),
          interpretation: "",
          status: "draft",
        });
        recordId = Number(created[0].insertId);
      }
    }
    return { ...result, recordId };
  }),

  save: protectedProcedure.input(recordInput).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "占卜档案暂不可保存，请稍后重试。" });

    const result = buildDivinationResult(input, input.ritualNonce);
    if (input.recordId) {
      const updated = await db.update(divinationRecords).set({ interpretation: input.interpretation, status: "complete" }).where(and(
        eq(divinationRecords.id, input.recordId),
        eq(divinationRecords.userId, ctx.user.id),
        eq(divinationRecords.ritualNonce, input.ritualNonce),
      ));
      if (updated[0].affectedRows > 0) return { id: input.recordId, seedFingerprint: result.seedFingerprint };
    }

    const saved = await db.insert(divinationRecords).values({
      userId: ctx.user.id,
      question: input.question,
      numberA: input.numberA,
      numberB: input.numberB,
      numberC: input.numberC,
      ritualNonce: input.ritualNonce,
      seedFingerprint: result.seedFingerprint,
      cardsJson: JSON.stringify(result.cards),
      plumJson: JSON.stringify(result.plum),
      interpretation: input.interpretation,
      status: "complete",
    });

    return { id: Number(saved[0].insertId), seedFingerprint: result.seedFingerprint };
  }),

  history: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const records = await db
      .select()
      .from(divinationRecords)
      .where(and(eq(divinationRecords.userId, ctx.user.id), eq(divinationRecords.status, "complete")))
      .orderBy(desc(divinationRecords.createdAt))
      .limit(50);

    return records.map((record) => ({
      ...record,
      cards: JSON.parse(record.cardsJson),
      plum: JSON.parse(record.plumJson),
    }));
  }),
});
