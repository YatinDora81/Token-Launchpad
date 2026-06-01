import { upload } from "@/lib/r2";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    const logoUrl = form.get("logoUrl")?.toString().trim();
    const name = form.get("name")?.toString().trim();
    const symbol = form.get("symbol")?.toString().trim();
    const description = form.get("description")?.toString().trim();

    if (!name || !symbol) {
      return NextResponse.json(
        { error: "name and symbol required" },
        { status: 400 },
      );
    }

    const id = crypto.randomUUID();
    let imageUrl = logoUrl;

    if (file instanceof File) {
      const ext = file.name.split(".").pop() || "png";
      const image = await upload(
        `uploads/${id}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        file.type || "image/png",
      );
      imageUrl = image.url;
    }

    if (!imageUrl) {
      return NextResponse.json({ error: "image required" }, { status: 400 });
    }

    const metadata: Record<string, unknown> = { name, symbol, image: imageUrl };
    if (description) metadata.description = description;

    const json = await upload(
      `uploads/${id}.json`,
      JSON.stringify(metadata),
      "application/json",
    );

    return NextResponse.json({ imageUrl, metadataUrl: json.url });
  } catch (error) {
    console.error("[upload]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}
