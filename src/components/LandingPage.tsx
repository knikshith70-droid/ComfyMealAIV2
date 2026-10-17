import { ArrowRight, Check, Clock3, Leaf, Refrigerator, Sparkles, UtensilsCrossed } from "lucide-react";
import { Logo, Wordmark } from "./Logo";

interface LandingPageProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const benefits = [
  {
    icon: Refrigerator,
    title: "Cook with what you have",
    description: "Turn ingredients already in your kitchen into practical meal ideas.",
  },
  {
    icon: Clock3,
    title: "Fit your real routine",
    description: "Find recipes that suit your available time, preferences, and household.",
  },
  {
    icon: Leaf,
    title: "Make food go further",
    description: "Plan around your pantry and help reduce forgotten ingredients and food waste.",
  },
];

export function LandingPage({ onGetStarted, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen overflow-hidden">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5" aria-label="ComfyMeal AI home">
          <Logo />
          <Wordmark />
        </a>
        <button type="button" onClick={onSignIn} className="btn-secondary px-4 py-2.5">
          Sign in <ArrowRight className="h-4 w-4" />
        </button>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="animate-fade-up">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50 px-3.5 py-2 text-sm font-medium text-sage-800">
              <Sparkles className="h-4 w-4" />
              Your everyday AI cooking companion
            </div>
            <h1 className="max-w-2xl text-balance font-serif text-4xl leading-tight tracking-tight text-charcoal-900 sm:text-5xl lg:text-6xl">
              Less wondering.
              <span className="block text-sage-700">More enjoying</span> what you cook.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-charcoal-700/75 sm:text-lg sm:leading-8">
              Meet ComfyMeal AI — a simpler way to decide what to cook. Get meal ideas based on the ingredients you have, your preferences, and the time available.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onGetStarted} className="btn-primary min-h-12 px-6">
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={onSignIn} className="btn-secondary min-h-12 px-6">
                I already have an account
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-charcoal-700/70">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-sage-700" /> Pantry-first ideas</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-sage-700" /> Made for your routine</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-sage-700" /> Your preferences matter</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-sage-200/40 blur-2xl" />
            <div className="relative rounded-[2rem] border border-cream-300/80 bg-white/80 p-4 shadow-card backdrop-blur sm:p-6">
              <div className="rounded-[1.5rem] bg-cream-100/80 p-5 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-sage-700">A little inspiration</p>
                    <h2 className="mt-1 font-serif text-2xl sm:text-3xl">What’s in your kitchen?</h2>
                  </div>
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                    <UtensilsCrossed className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-charcoal-700/70">Start with the ingredients you have. Let ComfyMeal AI help with the next step.</p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-cream-300/80 bg-white p-3 text-center">
                    <span className="text-3xl" role="img" aria-label="Tomato">🍅</span>
                    <p className="mt-2 text-sm font-medium">Tomatoes</p>
                  </div>
                  <div className="rounded-2xl border border-cream-300/80 bg-white p-3 text-center">
                    <span className="text-3xl" role="img" aria-label="Rice">🍚</span>
                    <p className="mt-2 text-sm font-medium">Rice</p>
                  </div>
                  <div className="rounded-2xl border border-cream-300/80 bg-white p-3 text-center">
                    <span className="text-3xl" role="img" aria-label="Spinach">🥬</span>
                    <p className="mt-2 text-sm font-medium">Greens</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-sage-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-100 text-sage-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">Ideas that fit you</p>
                      <p className="mt-0.5 text-sm text-charcoal-700/65">Ingredients · time · preferences</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="px-2 pb-1 pt-4 text-center text-xs text-charcoal-700/55">A more comfortable way to plan your next meal.</p>
            </div>
          </div>
        </section>

        <section className="border-y border-cream-300/70 bg-white/45">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sage-700">Made for everyday life</p>
              <h2 className="mt-3 font-serif text-3xl sm:text-4xl">A little less stress at mealtime</h2>
              <p className="mt-4 leading-7 text-charcoal-700/70">Whether you’re cooking for yourself or the whole household, start with what matters to you.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, description }) => (
                <article key={title} className="card p-6 sm:p-7">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-serif text-xl">{title}</h3>
                  <p className="mt-2 leading-7 text-charcoal-700/70">{description}</p>
                </article>
              ))}
            </div>
            <div className="mt-10 text-center">
              <button type="button" onClick={onGetStarted} className="btn-primary min-h-12 px-6">
                Start planning meals <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-7 text-sm text-charcoal-700/60 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© {new Date().getFullYear()} ComfyMeal AI</span>
        <span>Cook with comfort. Waste a little less.</span>
      </footer>
    </div>
  );
}
