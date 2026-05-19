"use client";

import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <OnboardingFlow />
    </div>
  );
}
