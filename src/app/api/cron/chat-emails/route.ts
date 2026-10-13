import { MessageService } from "@/src/services/messages";

export const dynamic = "force-dynamic";

// Called every minute by a scheduler (Vercel Cron or any other) with "Authorization: Bearer <CRON_SECRET>".
// Emails the team about customer chat messages nobody has opened yet.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });

  const emails = await MessageService.emailTeamAboutWaiting();
  return Response.json({ emails });
}
