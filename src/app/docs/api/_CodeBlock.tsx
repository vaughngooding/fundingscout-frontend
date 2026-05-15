/**
 * Shared CodeBlock used across all docs pages. Keeps the styling consistent
 * without each page having to redefine it. The leading underscore on the
 * file name keeps Next.js from treating this as a route.
 */
export default function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-[13px] leading-relaxed text-slate-200">
      <code>{children}</code>
    </pre>
  )
}

export function InlineCode({ children }: { children: string }) {
  return (
    <code className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.875em] text-emerald-300">
      {children}
    </code>
  )
}
