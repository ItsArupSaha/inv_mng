// CSS side-effect imports are processed by Next.js at build time. Next's own
// type declarations cover them via next-env.d.ts, but that file is generated
// (and gitignored), so environments without it — fresh clones, editor TS
// servers, CI type-checks — need this ambient declaration.
declare module '*.css';
