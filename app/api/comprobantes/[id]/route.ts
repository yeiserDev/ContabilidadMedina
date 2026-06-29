// GET /api/comprobantes/[id]  → sirve la imagen desde tu Drive (proxy).
// Hace que <img src> funcione de forma fiable, sin los problemas de los
// enlaces directos de Drive. Las fileId de Drive son largas e inadivinables.
import { NextResponse, type NextRequest } from "next/server";
import { fetchImage } from "@/lib/drive";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return new NextResponse("No encontrado", { status: 404 });

  try {
    const { data, mimeType } = await fetchImage(id);
    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    console.error("Error sirviendo comprobante:", e);
    return new NextResponse("No encontrado", { status: 404 });
  }
}
