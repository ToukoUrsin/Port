import { useState, useRef } from "react";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp, MessageCircle, Send, X } from "lucide-react";
import type { ReviewResult, VerificationEntry } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CoachingSuggestion, GeneralRefinement } from "./types";

type CoachingPanelProps = {
  review: ReviewResult;
  onAppeal: () => void;
  onSuggestionClick?: (paragraphRef: number) => void;
  onRefine?: (r: GeneralRefinement) => void;
};

function parseSuggestions(raw: string[] | CoachingSuggestion[]): CoachingSuggestion[] {
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((text) => ({ text }));
  }
  return raw as CoachingSuggestion[];
}

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; className: string; labelKey: string }> = {
  SUPPORTED: { icon: CheckCircle, className: "verification--supported", labelKey: "coaching.supported" },
  NOT_IN_SOURCE: { icon: AlertTriangle, className: "verification--warning", labelKey: "coaching.notInSource" },
  POSSIBLE_HALLUCINATION: { icon: XCircle, className: "verification--error", labelKey: "coaching.possibleHallucination" },
  FABRICATED_QUOTE: { icon: XCircle, className: "verification--error", labelKey: "coaching.fabricatedQuote" },
};

function VerificationItem({ entry }: { entry: VerificationEntry }) {
  const { t } = useLanguage();
  const config = STATUS_CONFIG[entry.status] || { icon: HelpCircle, className: "verification--warning", labelKey: entry.status };
  const Icon = config.icon;
  return (
    <div className={`verification-entry ${config.className}`}>
      <div className="verification-entry__header">
        <Icon size={14} />
        <span className="verification-entry__status">{t(config.labelKey)}</span>
      </div>
      <p className="verification-entry__claim">{entry.claim}</p>
      {entry.evidence && <p className="verification-entry__evidence">{entry.evidence}</p>}
    </div>
  );
}

function QuestionCard({
  suggestion,
  index: _index,
  onReply,
  onSuggestionClick,
}: {
  suggestion: CoachingSuggestion;
  index: number;
  onReply?: (questionText: string, answer: string) => void;
  onSuggestionClick?: (paragraphRef: number) => void;
}) {
  const { t } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (isDismissed) return null;

  function handleReply() {
    if (!replyText.trim() || !onReply) return;
    onReply(suggestion.text, replyText.trim());
    setReplyText("");
    setIsReplying(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
    if (e.key === "Escape") {
      setIsReplying(false);
      setReplyText("");
    }
  }

  return (
    <div
      className={`coaching-question ${suggestion.paragraph_ref !== undefined ? "coaching-question--clickable" : ""}`}
      onClick={() => {
        if (suggestion.paragraph_ref !== undefined && onSuggestionClick) {
          onSuggestionClick(suggestion.paragraph_ref);
        }
      }}
    >
      <button
        className="coaching-question__skip"
        onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
        title="Skip this question"
      >
        <X size={14} />
      </button>
      <p className="coaching-question__text">{suggestion.text}</p>
      {onReply && !isReplying && (
        <button
          className="coaching-question__reply-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsReplying(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          <MessageCircle size={14} />
          {t("coaching.reply")}
        </button>
      )}
      {isReplying && (
        <div className="coaching-question__reply" onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            type="text"
            className="coaching-question__reply-input"
            placeholder={t("coaching.typeAnswer")}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            className="coaching-question__reply-send"
            onClick={handleReply}
            disabled={!replyText.trim()}
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function CoachingPanel({
  review,
  onAppeal,
  onSuggestionClick,
  onRefine,
}: CoachingPanelProps) {
  const { t } = useLanguage();
  const [showVerificationDetail, setShowVerificationDetail] = useState(false);
  const suggestions = parseSuggestions(review.coaching.suggestions as string[] | CoachingSuggestion[]);

  const verified = review.verification?.filter((v) => v.status === "SUPPORTED").length ?? 0;
  const problematic = review.verification?.filter((v) => v.status !== "SUPPORTED") ?? [];
  const total = review.verification?.length ?? 0;

  function handleQuestionReply(questionText: string, answer: string) {
    if (!onRefine) return;
    // Compose the question + answer into a natural refinement
    onRefine({ text_note: `Regarding your question "${questionText.slice(0, 80)}...": ${answer}` });
  }

  return (
    <div className="coaching-panel">
      {/* 0. Celebration — warm opening */}
      {review.coaching.celebration && (
        <div className="coaching-celebration">
          <p>{review.coaching.celebration}</p>
        </div>
      )}

      {/* 1. Coaching questions — THE primary content */}
      {suggestions.length > 0 && (
        <div className="coaching-questions">
          {suggestions.map((s, i) => (
            <QuestionCard
              key={i}
              suggestion={s}
              index={i}
              onReply={onRefine ? handleQuestionReply : undefined}
              onSuggestionClick={onSuggestionClick}
            />
          ))}
        </div>
      )}

      {/* 2. Source check summary — collapsed by default */}
      {total > 0 && (
        <div className="verification-summary">
          <div className="verification-summary__counts">
            {verified > 0 && <span className="verification-summary__verified">{verified} {t("coaching.verified")}</span>}
            {verified > 0 && problematic.length > 0 && <span className="verification-summary__sep"> · </span>}
            {problematic.length > 0 && <span className="verification-summary__flagged">{problematic.length} {t("coaching.needInput")}</span>}
          </div>
          {problematic.length > 0 && (
            <button
              className="verification-summary__toggle"
              onClick={() => setShowVerificationDetail(!showVerificationDetail)}
            >
              {showVerificationDetail ? t("coaching.hide") : t("coaching.show")} {t("coaching.details")}
              {showVerificationDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {showVerificationDetail && (
            <div className="verification-detail">
              {problematic.map((entry, i) => (
                <VerificationItem key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Web sources */}
      {review.web_sources && review.web_sources.length > 0 && (
        <div className="web-sources">
          <p className="web-sources__label">{t("coaching.verifiedAgainst")}</p>
          <ul className="web-sources__list">
            {review.web_sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4. Yellow flags — gentle notes */}
      {review.yellow_flags.length > 0 && (
        <div className="yellow-flags">
          <h4 className="coaching-section-title">{t("coaching.notes")}</h4>
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="yellow-flag">
              <span className="yellow-flag__dimension">{flag.dimension}</span>
              {flag.suggestion}
            </p>
          ))}
        </div>
      )}

      {/* 5. Red triggers — warm framing */}
      {review.red_triggers.length > 0 && (
        <div className="red-gate-coaching">
          <h4 className="coaching-section-title">{t("coaching.toBulletproof")}</h4>
          {review.red_triggers.map((trigger, i) => (
            <div key={i} className="red-trigger">
              <p className="trigger-context">&ldquo;{trigger.sentence}&rdquo;</p>
              <ul className="fix-options">
                {trigger.fix_options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* 6. Appeal */}
      {review.gate === "RED" && (
        <button className="appeal-link" onClick={onAppeal}>
          {t("editor.appealLink")}
        </button>
      )}
    </div>
  );
}
