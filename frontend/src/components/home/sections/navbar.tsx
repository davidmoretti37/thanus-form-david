import Link from 'next/link';

export function Navbar() {
  return (
    <header className="sticky top-4 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 flex justify-end">
        <Link
          className="bg-secondary h-8 flex items-center justify-center text-sm font-normal tracking-wide rounded-full text-primary-foreground dark:text-secondary-foreground w-fit px-4 shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_3px_3px_-1.5px_rgba(16,24,40,0.06),0_1px_1px_rgba(16,24,40,0.08)] border border-white/[0.12]"
          href="/dashboard"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}
