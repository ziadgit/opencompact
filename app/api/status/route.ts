import { canSpend } from "@/lib/budget";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ ai: false, reason: "no-key" });
  if (!(await canSpend())) return Response.json({ ai: false, reason: "daily-budget" });
  return Response.json({ ai: true });
}
