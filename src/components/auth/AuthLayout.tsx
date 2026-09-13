import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="bg-bg text-ink flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-brand text-xl">&lt;AJUDA-DEV/&gt;</span>
      </div>
      <section className="bg-surface border-line w-full max-w-sm rounded-lg border p-6">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-ink-muted mt-1 text-sm">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </section>
    </main>
  );
}
