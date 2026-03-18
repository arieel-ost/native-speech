import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const WAITLIST_FILE = path.join(process.cwd(), "data", "waitlist.json");

async function ensureFile() {
  const dir = path.dirname(WAITLIST_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(WAITLIST_FILE);
  } catch {
    await fs.writeFile(WAITLIST_FILE, "[]", "utf-8");
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    await ensureFile();
    const raw = await fs.readFile(WAITLIST_FILE, "utf-8");
    const entries: { email: string; date: string }[] = JSON.parse(raw);

    if (entries.some((e) => e.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ ok: true, alreadySubscribed: true });
    }

    entries.push({ email: email.toLowerCase(), date: new Date().toISOString() });
    await fs.writeFile(WAITLIST_FILE, JSON.stringify(entries, null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
