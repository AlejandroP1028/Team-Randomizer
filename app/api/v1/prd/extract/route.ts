import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Expected multipart/form-data." } },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "No file provided." } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === "application/pdf") {
    const result = await pdfParse(buffer);
    return NextResponse.json({ text: result.text });
  }

  if (file.type.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer });
    return NextResponse.json({ text: result.value });
  }

  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "Only PDF and .docx files are supported." } },
    { status: 400 }
  );
}
