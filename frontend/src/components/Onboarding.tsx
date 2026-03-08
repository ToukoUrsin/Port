import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Newspaper, Mic, Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import "./Onboarding.css";

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const { t } = useLanguage();

  const steps = [
    {
      icon: <Newspaper size={36} />,
      title: t("onboard.welcomeTitle"),
      desc: t("onboard.welcomeDesc"),
    },
    {
      icon: <Mic size={36} />,
      title: t("onboard.howTitle"),
      desc: null,
      bullets: [
        t("onboard.step1"),
        t("onboard.step2"),
        t("onboard.step3"),
      ],
    },
    {
      icon: <Shield size={36} />,
      title: t("onboard.qualityTitle"),
      desc: t("onboard.qualityDesc"),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return createPortal(
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-body" key={step}>
          <div className="onboarding-icon">{current.icon}</div>
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
          <button className="onboarding-skip-btn" onClick={onComplete}>
            {t("onboard.skip")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
