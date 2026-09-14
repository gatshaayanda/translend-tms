import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

const ALLOWED: OrgRole[] = ["owner", "operations_manager", "fleet_manager"];
export async function POST(request: Request) {
  try {
    const header=request.headers.get("authorization"); if(!header?.startsWith("Bearer ")) return NextResponse.json({error:"Authentication required."},{status:401});
    const actor=await getAdminAuth().verifyIdToken(header.slice(7)); const body=await request.json(); const orgId=String(body.orgId??""); const driverId=String(body.driverId??""); const email=String(body.email??"").trim().toLowerCase();
    if(!orgId||!driverId||!email) return NextResponse.json({error:"Organization, driver and account email are required."},{status:400});
    const db=getAdminDb(); const member=await db.doc(`organizations/${orgId}/members/${actor.uid}`).get(); const role=member.data()?.role as OrgRole;
    if(!member.exists||member.data()?.status!=="active"||!ALLOWED.includes(role)) return NextResponse.json({error:"Fleet or operations manager access required."},{status:403});
    const driverRef=db.doc(`organizations/${orgId}/drivers/${driverId}`); const driver=await driverRef.get(); if(!driver.exists) return NextResponse.json({error:"Driver record not found."},{status:404});
    const data=driver.data()!; if(String(data.email??"").trim().toLowerCase()!==email) return NextResponse.json({error:"Account email must exactly match the Driver record email before linking."},{status:409});
    const account=await getAdminAuth().getUserByEmail(email);
    const existing=await db.collection(`organizations/${orgId}/drivers`).where("linkedUid","==",account.uid).limit(2).get();
    if(existing.docs.some(d=>d.id!==driverId)) return NextResponse.json({error:"This account is already linked to another driver record."},{status:409});
    await driverRef.update({linkedUid:account.uid,updatedAt:FieldValue.serverTimestamp(),updatedBy:actor.uid});
    return NextResponse.json({ok:true,driverId,linkedUid:account.uid});
  } catch(error) {
    const code=(error as {code?:string})?.code; if(code==="auth/user-not-found") return NextResponse.json({error:"No signed-in Translend account exists for that driver email yet. Invite/sign in first, then link it."},{status:404});
    return NextResponse.json({error:error instanceof Error?error.message:"Driver link failed."},{status:500});
  }
}
