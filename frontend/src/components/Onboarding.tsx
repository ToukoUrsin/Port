import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import "./Onboarding.css";

const STORAGE_KEY = "onboarding_done";

interface OnboardingProps {
  onComplete: () => void;
}

export function shouldShowOnboarding(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();

  const steps = [
    {
      title: t("onboard.welcomeTitle"),
      desc: t("onboard.welcomeDesc"),
    },
    {
      title: t("onboard.howTitle"),
      desc: null,
      bullets: [
        t("onboard.step1"),
        t("onboard.step2"),
        t("onboard.step3"),
      ],
    },
    {
      title: t("onboard.qualityTitle"),
      desc: t("onboard.qualityDesc"),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const finish = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    onComplete();
  }, [onComplete]);

  const next = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, finish]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-body" key={step}>
          <h2 className="onboarding-title">{current.title}</h2>
          {current.desc && <p className="onboarding-desc">{current.desc}</p>}
          {"bullets" in current && current.bullets && (
            <div className="onboarding-steps">
              {current.bullets.map((text, i) => (
                <div className="onboarding-step" key={i}>
                  <span className="onboarding-step-num">{i + 1}</span>
                  <span className="onboarding-step-text">{text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="onboarding-footer">
          <div className="onboarding-dots">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`onboarding-dot ${i === step ? "onboarding-dot--active" : ""}`}
              />
            ))}
          </div>
          <button className="onboarding-next-btn" onClick={next}>
            {isLast ? t("onboard.getStarted") : t("onboard.next")}
          </button>
          <button className="onboarding-skip-btn" onClick={finish}>
            {t("onboard.skip")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
