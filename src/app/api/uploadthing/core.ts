import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/next";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

const f = createUploadthing();

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new UploadThingError("Unauthorized");
  }

  const idToken = authorization.slice("Bearer ".length).trim();

  if (!idToken) {
    throw new UploadThingError("Unauthorized");
  }

  try {
    return await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new UploadThingError("Invalid authentication token");
  }
}

async function verifyOrganizationMembership(
  orgId: string,
  uid: string,
): Promise<"owner" | "admin" | "dispatcher" | "driver" | "viewer"> {
  const membershipRef = adminDb.doc(
    `organizations/${orgId}/members/${uid}`,
  );

  const membershipSnap = await membershipRef.get();

  if (!membershipSnap.exists) {
    throw new UploadThingError("Organization membership not found");
  }

  const membership = membershipSnap.data();

  if (membership?.status !== "active") {
    throw new UploadThingError("Organization membership is not active");
  }

  const role = membership.role;

  if (
    role !== "owner" &&
    role !== "admin" &&
    role !== "dispatcher" &&
    role !== "driver" &&
    role !== "viewer"
  ) {
    throw new UploadThingError("Invalid organization membership");
  }

  return role;
}

export const ourFileRouter = {
  podEvidence: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
    pdf: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      const user = await authenticateRequest(req);

      const orgId = new URL(req.url).searchParams.get("orgId");

      if (!orgId) {
        throw new UploadThingError("Organization is required");
      }

      const role = await verifyOrganizationMembership(orgId, user.uid);

      return {
        uid: user.uid,
        orgId,
        role,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.uid,
        organizationId: metadata.orgId,
        role: metadata.role,
        url: file.ufsUrl,
        key: file.key,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
