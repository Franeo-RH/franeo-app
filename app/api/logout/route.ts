import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ succes: true });
  
  response.cookies.set("userId", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}