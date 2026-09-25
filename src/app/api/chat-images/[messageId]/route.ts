import { getCurrentUser } from "@/src/lib/session";
import { MessageService } from "@/src/services/messages";

export const dynamic = "force-dynamic";

// Photos are private: only the order's customer and admins can load them.
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  const viewer = await getCurrentUser();
  const image = await MessageService.getImage(messageId, viewer);

  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
