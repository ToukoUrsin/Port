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
};
