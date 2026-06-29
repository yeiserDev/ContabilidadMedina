// GET /api/comprobantes/[id]  → sirve la imagen desde tu Drive (proxy).
// Hace que <img src> funcione de forma fiable, sin los problemas de los
// enlaces directos de Drive. Las fileId de Drive son largas e inadivinables.
import { NextResponse, type NextRequest } from "next/server";
import { fetchImage, deleteImage } from "@/lib/drive";
import { verifyEmailUser } from "@/lib/verifyToken";

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

// DELETE /api/comprobantes/[id]  → borra el archivo de tu Drive.
// Requiere sesión de email (mismo guardia que la subida).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await verifyEmailUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  try {
    await deleteImage(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error borrando comprobante:", e);
    return NextResponse.json({ error: "No se pudo borrar" }, { status: 500 });
  }
}
