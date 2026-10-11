const SECTIONS = [
  { id: "intro", title: "Introduction", hint: "A short headline about who you are and what you build." },
  { id: "about", title: "About", hint: "Your background and how you approach software." },
  { id: "experience", title: "Experience", hint: "Roles, companies and timelines." },
  { id: "skills", title: "Skills", hint: "Languages, frameworks and tools." },
  { id: "projects", title: "Projects", hint: "Highlights — also visible as buildings in the city." },
  { id: "contact", title: "Contact", hint: "Email and professional profiles." },
];

export function PortfolioPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-32 sm:pt-28">
      <div className="glass rounded-3xl p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Portfolio</p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Your professional portfolio lives here.</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          This space is ready for your real portfolio content. Nothing below is invented — each section is a placeholder
          waiting for your details.
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <section key={s.id} aria-labelledby={s.id} className="glass rounded-3xl p-6">
            <h2 id={s.id} className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.hint}</p>
            <div className="mt-4 h-2 w-2/3 rounded-full bg-secondary" />
            <div className="mt-2 h-2 w-1/2 rounded-full bg-secondary" />
          </section>
        ))}
      </div>
    </main>
  );
}
