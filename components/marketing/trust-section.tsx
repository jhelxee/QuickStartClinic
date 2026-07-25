import { CalendarClock, ClipboardList, Compass, Users } from "lucide-react";

const stats = [
  { value: "12+", label: "Years serving local families" },
  { value: "3", label: "Specialties under one roof" },
  { value: "98%", label: "Caregivers who feel heard at intake" },
  { value: "45 min", label: "Average first-visit length" },
];

const steps = [
  {
    icon: ClipboardList,
    title: "Share your concerns",
    description:
      "A brief intake form and a real conversation — no rushed checklists. We want the full picture before we ever meet.",
  },
  {
    icon: Compass,
    title: "Build a coordinated plan",
    description:
      "Your specialists compare notes and design one plan across pediatrics, speech, and OT, paced to your child.",
  },
  {
    icon: CalendarClock,
    title: "Grow, with check-ins",
    description:
      "Regular milestone reviews keep the plan honest — adjusting as your child does, not on a fixed calendar.",
  },
];

export function TrustSection() {
  return (
    <section id="approach" className="bg-navy-900 py-24">
      <div className="container-clinic">
        <div className="grid gap-6 rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-10">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="font-display text-3xl font-medium text-white">
                {stat.value}
              </span>
              <span className="text-sm text-white/60">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-20 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="max-w-md">
            <span className="text-sm font-semibold tracking-wide text-brand-blue-400 uppercase">
              How we work
            </span>
            <h2 className="mt-3 font-display text-3xl font-medium text-white sm:text-4xl">
              A calmer path to answers.
            </h2>
            <p className="mt-4 flex items-center gap-2 text-sm text-white/70">
              <Users className="size-4 text-brand-blue-400" />
              Every family is assigned one point of contact across all three
              specialties.
            </p>
          </div>

          <ol className="grid gap-8 sm:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-blue-600 font-display text-sm text-white">
                    {index + 1}
                  </span>
                  <step.icon className="size-5 text-brand-blue-400" strokeWidth={1.75} />
                </div>
                <h3 className="font-display text-lg text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
