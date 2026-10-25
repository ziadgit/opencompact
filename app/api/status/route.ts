export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ai: Boolean(process.env.GEMINI_API_KEY) });
}
