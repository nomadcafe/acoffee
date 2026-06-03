// Minimal ambient declaration for nodemailer. We don't depend on
// @types/nodemailer — the only call site (src/lib/email.ts) casts the
// transport to the slice it uses — so this just lets tsc resolve the
// literal `import("nodemailer")` to `any` instead of erroring on a
// missing type declaration. The runtime package is a real dependency
// (package.json + pnpm-lock) and is bundled via serverExternalPackages.
declare module "nodemailer";
