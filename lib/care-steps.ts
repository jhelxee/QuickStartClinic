import {
  AudioLines,
  Brain,
  ClipboardCheck,
  Ear,
  Eye,
  Hand,
  HandHeart,
  Handshake,
  Home,
  MessageCircleHeart,
  MessageSquareText,
  Smile,
  type LucideIcon,
} from "lucide-react";

export interface CareStep {
  icon: LucideIcon;
  title: string;
  description: string;
}

export interface ServiceCareInfo {
  /** Matches serviceOptions in lib/validation.ts and doctors.service_slug. */
  slug: "developmental-pediatrician" | "speech-therapy" | "occupational-therapy";
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  /** Illustrative only — actual visit length varies by child. */
  duration: string;
  /**
   * Sample first-visit flow, shown on /what-to-expect/[slug]. These are
   * deliberately generic and reassuring rather than a clinical protocol —
   * every child's visit is adapted to their needs. That caveat is repeated in
   * the UI itself, not left implicit.
   */
  steps: CareStep[];
}

export const careInfo: ServiceCareInfo[] = [
  {
    slug: "developmental-pediatrician",
    icon: Brain,
    title: "Developmental Pediatrician",
    description:
      "Comprehensive developmental evaluations and ongoing medical guidance for delays in motor skills, language, behavior, and social-emotional growth.",
    points: ["Diagnostic evaluations", "Growth & milestone tracking", "Coordinated referrals"],
    duration: "First visits typically run about 45–60 minutes",
    steps: [
      {
        icon: Handshake,
        title: "Welcome & check-in",
        description:
          "You'll meet your care coordinator, share what's on your mind, and fill out a short history form together.",
      },
      {
        icon: Ear,
        title: "Telling your child's story",
        description:
          "The doctor listens first — milestones, behaviors, and the questions that brought you in.",
      },
      {
        icon: Eye,
        title: "Getting to know your child",
        description:
          "Through gentle, play-based observation, the doctor watches how your child moves, communicates, and connects. No needles, no pressure.",
      },
      {
        icon: MessageSquareText,
        title: "Talking through what we see",
        description:
          "You'll hear what was observed, in plain language, with plenty of time for your questions.",
      },
      {
        icon: ClipboardCheck,
        title: "A plan built around your family",
        description:
          "Clear next steps — therapy referrals, home strategies, or a follow-up visit — whatever fits your child.",
      },
    ],
  },
  {
    slug: "speech-therapy",
    icon: MessageCircleHeart,
    title: "Speech Therapy",
    description:
      "Individualized therapy for articulation, language delay, fluency, and feeding — building the communication skills your child needs to be understood.",
    points: ["Articulation & language", "Feeding & swallowing support", "AAC & communication tools"],
    duration: "First sessions typically run about 45–60 minutes",
    steps: [
      {
        icon: Smile,
        title: "Welcome & warm-up",
        description:
          "Your therapist introduces themselves and helps your child settle in with an easy, low-pressure activity.",
      },
      {
        icon: Ear,
        title: "Sharing your concerns",
        description:
          "A conversation about talking, feeding, or understanding — and any history that matters.",
      },
      {
        icon: AudioLines,
        title: "A playful speech & language check",
        description:
          "Through games and everyday conversation, the therapist listens for sounds, words, and how your child understands language.",
      },
      {
        icon: MessageSquareText,
        title: "Explaining what we found",
        description: "Strengths and areas to support, walked through clearly — no jargon.",
      },
      {
        icon: Home,
        title: "A plan you can use at home",
        description:
          "Simple exercises to try at home, plus a therapy schedule if ongoing sessions are recommended.",
      },
    ],
  },
  {
    slug: "occupational-therapy",
    icon: HandHeart,
    title: "Occupational Therapy",
    description:
      "Hands-on support for fine motor skills, sensory processing, and everyday independence — from handwriting to getting dressed with confidence.",
    points: ["Sensory integration", "Fine & gross motor skills", "Everyday independence skills"],
    duration: "First sessions typically run about 45–60 minutes",
    steps: [
      {
        icon: Smile,
        title: "Welcome & getting comfortable",
        description: "Your therapist greets your child and eases in with a simple, fun activity.",
      },
      {
        icon: Ear,
        title: "Hearing what matters to you",
        description:
          "You share the everyday challenges — handwriting, dressing, sensory sensitivities — whatever brought you in.",
      },
      {
        icon: Hand,
        title: "A hands-on skills check",
        description:
          "Through play and simple tasks, the therapist observes fine motor skills, coordination, and how your child responds to sensory input.",
      },
      {
        icon: MessageSquareText,
        title: "Reviewing the results together",
        description:
          "Findings connected to what you already see at home, explained in everyday language.",
      },
      {
        icon: ClipboardCheck,
        title: "Strategies & next steps",
        description:
          "Practical home strategies, plus a recommended therapy plan if regular sessions would help.",
      },
    ],
  },
];

export function getCareInfo(slug: string): ServiceCareInfo | undefined {
  return careInfo.find((service) => service.slug === slug);
}
