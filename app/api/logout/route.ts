import { NextResponse } from "next/server";
import { fermerSession } from "@/lib/jeton-session";

export async function POST() {
  const response = NextResponse.json({ succes: true });
  
  return fermerSession(response);
}