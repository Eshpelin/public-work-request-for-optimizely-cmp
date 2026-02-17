import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "File uploads are handled through the submissions endpoint." },
    { status: 501 }
  );
}
