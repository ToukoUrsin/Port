import type { ReviewResult, ArticleMetadata, RedTrigger } from "@/lib/types";

export type CoachingSuggestion = {
  text: string;
  paragraph_ref?: number;
};

export type TargetedRefinement = {
  selected_text: string;
  instruction: string;
  paragraph_index: number;
};

export type GeneralRefinement = {
  voice_clip?: Blob;
  text_note?: string;
};

export type ActiveAnnotation = {
  trigger: RedTrigger;
  rect: DOMRect;
} | null;

export type TextSelection = {
  text: string;
  paragraphIndex: number;
  rect: DOMRect;
};

export type ParagraphTap = {
  index: number;
  element: HTMLElement;
  rect: DOMRect;
};

export type RephraseRequest = {
  selected_text: string;
  paragraph_index: number;
};

export type EditorialScreenProps = {
  articleMarkdown: string;
  review: ReviewResult;
  metadata: ArticleMetadata;
  userName: string;
  currentRound?: number;

  onRefineGeneral: (r: GeneralRefinement) => Promise<void>;
  onPublish: () => Promise<void>;
  onAppeal: () => Promise<void>;
  onBack: () => void;
  onContentChange?: (markdown: string) => void;
  saveStatus?: "saved" | "saving" | "unsaved";
};
