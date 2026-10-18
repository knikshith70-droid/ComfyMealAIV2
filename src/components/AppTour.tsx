import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChefHat, X } from "lucide-react";
import { useNav, type Page } from "../lib/nav";

const TOUR_KEY = "comfymeal-guided-tour-v1";

type TourStep = {
  page: Page;
  eyebrow: string;
  title: string;
  description: string;
  tip: string;
};

const STEPS: TourStep[] = [
  {
    page: "dashboard",
    eyebrow: "WELCOME TO COMFYMEAL AI",
    title: "Your kitchen, made simpler",
    description: "This is your home base. Start here whenever you need inspiration for what to cook, or want to jump back into a feature.",
    tip: "You can return to the dashboard from the ComfyMeal AI logo.",
  },
  {
    page: "generate",
    eyebrow: "STEP 2 OF 7",
    title: "Find your next meal",
    description: "Use Generate Recipe to explore dishes based on ingredients you have, your preferences, and the details you provide.",
    tip: "The more useful details you add, the more tailored your recipe suggestions can be.",
  },
  {
    page: "saved",
    eyebrow: "STEP 3 OF 7",
    title: "Keep favourites close",
    description: "Saved Recipes is where you can revisit recipes you have saved instead of searching for them again.",
    tip: "Save recipes you would happily cook again.",
  },
  {
    page: "recent",
    eyebrow: "STEP 4 OF 7",
    title: "Pick up where you left off",
    description: "Recent Recipes helps you find recipes you have viewed or worked with recently.",
    tip: "Use it when you want to return to a dish you saw earlier.",
  },
  {
    page: "meal-plan",
    eyebrow: "STEP 5 OF 7",
    title: "Plan meals ahead",
    description: "Use Meal Plan to organise upcoming meals and reduce the daily guesswork around breakfast, lunch, dinner, and snacks.",
    tip: "Build a plan around your household and food preferences.",
  },
  {
    page: "language",
    eyebrow: "STEP 6 OF 7",
    title: "Make it feel like yours",
    description: "Choose your preferred app language in Language Settings. The globe in the top bar also gives you quick language access.",
    tip: "Your language choice is saved by the app.",
  },
  {
    page: "account",
    eyebrow: "STEP 7 OF 7",
    title: "Manage your preferences",
    description: "Account Settings is where you can review your account-related settings and food preferences available in the app.",
    tip: "You can reopen this tour any time from the three-line menu.",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onFinish: () => void;
}

export function AppTour({ open, onClose, onFinish }: Props) {
  const { navigate } = useNav();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      navigate(STEPS[0].page);
    }
  }, [open]);

  if (!open) return null;

  const moveTo = (nextIndex: number) => {
    setStepIndex(nextIndex);
    navigate(STEPS[nextIndex].page);
  };

  const finish = () => {
    onFinish();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal-900/55 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="comfymeal-tour-title">
      <section className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cream-200 bg-cream-50 shadow-2xl">
        <div className="h-1.5 w-full bg-cream-200">
          <div className="h-full rounded-r-full bg-sage-600 transition-all duration-300" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
        </div>
        <button type="button" onClick={finish} aria-label="Close tour" className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-charcoal-700/60 hover:bg-cream-200 hover:text-charcoal-900">
          <X className="h-4 w-4" />
        </button>
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
            <ChefHat className="h-6 w-6" />
          </div>
          <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-sage-700">{step.eyebrow}</p>
          <h2 id="comfymeal-tour-title" className="mb-3 pr-8 text-3xl leading-tight">{step.title}</h2>
          <p className="text-sm leading-6 text-charcoal-700/80">{step.description}</p>
          <div className="mt-5 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3">
            <p className="text-sm leading-5 text-sage-900"><span className="font-semibold">Quick tip: </span>{step.tip}</p>
          </div>
          <div className="mt-7 flex items-center justify-between gap-3">
            <button type="button" onClick={() => stepIndex === 0 ? finish() : moveTo(stepIndex - 1)} className="btn-secondary">
              {stepIndex === 0 ? "Skip tour" : <><ArrowLeft className="h-4 w-4" /> Back</>}
            </button>
            <div className="text-xs font-medium text-charcoal-700/55">{stepIndex + 1} of {STEPS.length}</div>
            <button type="button" onClick={() => stepIndex === STEPS.length - 1 ? finish() : moveTo(stepIndex + 1)} className="btn-primary">
              {stepIndex === STEPS.length - 1 ? <><Check className="h-4 w-4" /> Finish</> : <>Next <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function hasSeenAppTour(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "complete";
  } catch {
    return false;
  }
}

export function markAppTourSeen(): void {
  try {
    window.localStorage.setItem(TOUR_KEY, "complete");
  } catch {
    // The tour still works if browser storage is unavailable.
  }
}
