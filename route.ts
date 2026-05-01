import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createUser } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      )
    }

    // Check if admin user already exists
    const existingUser = await db.user.findFirst()
    if (existingUser) {
      return NextResponse.json(
        { error: "Admin user already exists" },
        { status: 400 }
      )
    }

    // Create admin user
    await createUser(username, password)

    return NextResponse.json({ message: "Admin user created successfully" })
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      { error: "Failed to create admin user" },
      { status: 500 }
    )
  }
}
