# Translend independent foundation

This document records the extraction boundary from AdminHub Global.

## Retained
- Verified Translend application shell and v19 visual language.
- Next.js/React/TypeScript/Tailwind application chassis.
- Firebase client/server separation.
- Firebase Admin ID-token verification boundary.
- Role/capability authorization model.
- PWA/deployment concepts only where independently implemented.
- Vercel analytics/speed-insights may be used without AdminHub business dependencies.

## Removed
- AdminHub business routes and data models.
- AdminHub Basic Auth.
- AdminHub production Firebase project/configuration and credentials.
- AdminHub Firestore rules/data.
- AdminHub-specific service-worker route behavior.
- AdminHub client portal, blogs, projects, leads, proposals and unrelated APIs.
- Build/type-error suppression.

## Firebase boundary
Project: `translend-tms-dcd2a`.
Web app ID: `1:709874086439:web:251e8be3956dcbf4865402`.

Authentication: Firebase Auth with Google provider planned/enabled through Firebase Console. Firestore and Storage are separate Translend resources. No AdminHub Firebase resource is shared.

## Verification contract
The foundation is not complete until installation, TypeScript, lint, build, `/translend`, Google sign-in, server-side ID-token verification, Firebase separation, and Vercel deployment are verified.
