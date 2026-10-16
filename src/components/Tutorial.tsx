"use client";
import { useState } from "react";
import { NoiseLab } from "./flight-school-1/NoiseLab";
import { ProtectionLab } from "./flight-school-2/ProtectionLab";
import { TimelineLab } from "./learning/TimelineLab";
export function Tutorial({
  start,
  onStep,
  onFinish,
  onSkip,
  onBack = () => {},
  unlocked = false,
  onNavigate,
}: {
  start: number;
  onStep: (s: number) => void;
  onFinish: () => void;
  onSkip: () => void;
  onBack?: () => void;
  unlocked?: boolean;
  onNavigate?: (step: number) => void;
}) {
  const [step, setStep] = useState(start),
    [maxReached, setMaxReached] = useState(unlocked ? 5 : start);
  function visit(n: number) {
    const highest = Math.max(maxReached, n);
    setMaxReached(highest);
    setStep(n);
    onStep(highest);
    onNavigate?.(n);
  }
  function next() {
    if (step === 5) onFinish();
    else visit(step + 1);
  }
  const props = {
    onContinue: next,
    onSkip,
    onBack,
    onLesson: visit,
    previous: maxReached,
  };
  if (step === 0)
    return (
      <NoiseLab
        onContinue={next}
        onSkip={onSkip}
        onBack={onBack}
        unlocked={unlocked}
        onLesson={visit}
        previous={maxReached}
      />
    );
  if (step === 1) return <ProtectionLab {...props} />;
  return (
    <TimelineLab key={step} {...props} number={(step + 1) as 3 | 4 | 5 | 6} />
  );
}
