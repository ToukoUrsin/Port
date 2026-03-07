import type { ReviewResult, ArticleMetadata, ArticleVersion } from "@/lib/types";

export type TargetedRefinement = {
  selected_text: string;
  instruction: string;
  paragraph_index: number;
};

export type GeneralRefinement = {
  voice_clip?: Blob;
  text_note?: string;
};

export type RephraseRequest = {
  selected_text: string;
  paragraph_index: number;
};

export type RephraseResponse = {
  options: string[];
};

export type CoachingSuggestion = {
  text: string;
  paragraph_ref?: number;
};

export type TextSelection = {
  text: string;
  rect: DOMRect;
  paragraphIndex: number;
};

export type ParagraphTap = {
  index: number;
  element: HTMLElement;
  rect: DOMRect;
};

export type EditorialScreenProps = {
  articleMarkdown: string;
  review: ReviewResult;
  metadata: ArticleMetadata;
  userName: string;
  versions?: ArticleVersion[];
  currentRound?: number;

  onRefineTargeted: (r: TargetedRefinement) => Promise<void>;
  onRefineGeneral: (r: GeneralRefinement) => Promise<void>;
  onRephrase: (r: RephraseRequest) => Promise<RephraseResponse>;
  onPublish: () => Promise<void>;
  onAppeal: () => Promise<void>;
  onBack: () => void;
};
