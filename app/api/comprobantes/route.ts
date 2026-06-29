// POST /api/comprobantes  → sube un comprobante (imagen comprimida) a tu Drive.
// Requiere Authorization: Bearer <Firebase ID token> de un usuario con email.
import { NextResponse, type NextRequest } from "next/server";
import { verifyEmailUser } from "@/lib/verifyToken";
import { uploadImage } from "@/lib/drive";
import { corsHeaders } from "@/lib/cors";

export const runtime = "nodejs";

const MAX_BYTES = 3 * 1024 * 1024; // tope de seguridad (la app comprime a ~130 KB)

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const cors = corsHeaders(req);

  const user = await verifyEmailUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: cors }
    );
  }

  try {
    const body = (await req.json()) as { image?: string; mimeType?: string };
    if (!body.image) {
      return NextResponse.json(
        { error: "Falta la imagen" },
        { status: 400, headers: cors }
      );
    }

    // Acepta dataURL ("data:image/jpeg;base64,...") o base64 puro.
    const base64 = body.image.includes(",")
      ? body.image.split(",")[1]
      : body.image;
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Imagen demasiado grande" },
        { status: 413, headers: cors }
      );
    }

    const mimeType = body.mimeType || "image/jpeg";
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const name = `comprobante_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const fileId = await uploadImage(buffer, mimeType, name);
    return NextResponse.json({ fileId }, { status: 200, headers: cors });
  } catch (e) {
    console.error("Error subiendo comprobante:", e);
    return NextResponse.json(
      { error: "Error al subir" },
      { status: 500, headers: cors }
    );
  }
}
