'use client';

import ContributorsTable from '@/components/ui/ruixen-contributors-table';

export default function TasksHumanPage() {
  return (
    <main className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-10">
      <header className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] leading-none font-semibold text-black dark:text-white">TARS</span>
          <span className="text-[24px] leading-none font-semibold bg-gradient-to-b from-blue-400 to-cyan-400 text-transparent bg-clip-text">
            /
          </span>
          <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Tasks Human</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Espaço para gerenciamento de tarefas humanas e contribuições.
        </p>
      </header>

      <section className="rounded-2xl border bg-white/40 dark:bg-black/45 backdrop-blur-2xl ring-1 ring-black/5 dark:ring-black/40 p-6 min-h-[320px]">
        <ContributorsTable />
      </section>
    </main>
  );
}
