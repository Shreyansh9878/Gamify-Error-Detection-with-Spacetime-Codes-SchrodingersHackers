"use client";
import { useState } from "react";
import { NoiseLab } from "./flight-school-1/NoiseLab";
import { ProtectionLab } from "./flight-school-2/ProtectionLab";
import { CheckLab } from "./flight-school-3/CheckLab";
import { AdvancedLab } from "./advanced-learning/AdvancedLab";
import { GraduationLab } from "./advanced-learning/GraduationLab";
export function Tutorial({
  start,
  onStep,
  onFinish,
  onSkip,
  onBack = () => {},
  unlocked = false,
}: {
  start: number;
  onStep: (s: number) => void;
  onFinish: () => void;
  onSkip: () => void;
  onBack?: () => void;
  unlocked?: boolean;
}) {
  const [step, setStep] = useState(start),
    [maxReached, setMaxReached] = useState(unlocked ? 5 : start);
  function visit(n: number) {
    const highest = Math.max(maxReached, n);
    setMaxReached(highest);
    setStep(n);
    onStep(highest);
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
  if (step === 2) return <CheckLab {...props} />;
  if (step === 3 || step === 4)
    return <AdvancedLab key={step} {...props} number={step === 3 ? 4 : 5} />;
  return <GraduationLab {...props} />;
}
