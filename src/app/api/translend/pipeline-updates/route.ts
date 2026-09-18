import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { translendAdminDb } from "@/lib/translend/firebase/admin";
import { verifyTranslendIdToken } from "@/lib/translend/auth/verify-id-token";

const COLLECTION = "translendPipelineUpdates";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET() {
  const snapshot = await translendAdminDb.collection(COLLECTION).orderBy("date", "desc").limit(30).get();
  const updates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return NextResponse.json({ updates });
}

export async function POST(request: NextRequest) {
  try {
    const header = request.headers.get("authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const decoded = await verifyTranslendIdToken(token);

    const body = await request.json();
    const date = clean(body.date, 10);
    const title = clean(body.title, 120);
    const next = clean(body.next, 1000);
    const loomUrl = clean(body.loomUrl, 500);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !title || !next) {
      return NextResponse.json({ error: "Please add a date, title and next step." }, { status: 400 });
    }

    if (loomUrl && !/^https:\/\/(www\.)?loom\.com\//i.test(loomUrl)) {
      return NextResponse.json({ error: "Please use a Loom link." }, { status: 400 });
    }

    const ref = await translendAdminDb.collection(COLLECTION).add({
      date,
      title,
      next,
      loomUrl,
      createdBy: decoded.uid,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ update: { id: ref.id, date, title, next, loomUrl } }, { status: 201 });
  } catch (error) {
    console.error("Pipeline update failed", error);
    return NextResponse.json({ error: "Please sign in and try again." }, { status: 401 });
  }
}
