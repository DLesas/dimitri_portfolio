"use server";

import { cookies } from "next/headers";

// Store the password in environment variable
// Add FELIX_PASSWORD=your-secure-password to your .env.local file
const CORRECT_PASSWORD = process.env.FELIX_PASSWORD || "test";

export async function verifyPassword(password: string) {
  console.log(CORRECT_PASSWORD)
  if (!password) {
    return {
      success: false,
      message: "Password is required",
    };
  }

  if (password === CORRECT_PASSWORD) {
    // Set HTTP-only cookie for session (expires in 24 hours)
    // Scoped to /_Felix path only
    const cookieStore = await cookies();
    cookieStore.set("felix-auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/Felix",
    });

    return {
      success: true,
      message: "Authentication successful",
    };
  }

  return {
    success: false,
    message: "Incorrect password",
  };
}

export async function checkAuth() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("felix-auth");

  return authCookie?.value === "authenticated";
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("felix-auth");

  return {
    success: true,
    message: "Logged out successfully",
  };
}
