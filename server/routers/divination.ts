import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { buildDivinationResult } from "../divinationEngine";

const questionSchema = z.string().trim().min(2, "请写下至少两个字的问题").max(300, "问题请控制在 300 字以内");
const divinationInput = z.object({
  question: questionSchema,
  numberA: z.number().int().min(1).max(999),
  numberB: z.number().int().min(1).max(999),
  numberC: z.number().int().min(1).max(999),
});

export const divinationRouter = router({
  draw: publicProcedure.input(divinationInput).mutation(({ input }) => {
    const ritualNonce = crypto.randomUUID().replaceAll("-", "");
    return buildDivinationResult(input, ritualNonce);
  }),
});
