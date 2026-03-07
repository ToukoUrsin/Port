package services

import (
	"bufio"
	"fmt"
	"os"
	"strings"
	"unicode"
)

// WordPieceTokenizer is a minimal WordPiece tokenizer for BERT-style cross-encoder input.
type WordPieceTokenizer struct {
	vocab   map[string]int32
	unkID   int32
	clsID   int32
	sepID   int32
	padID   int32
	maxLen  int
}

func NewWordPieceTokenizer(vocabPath string, maxLen int) (*WordPieceTokenizer, error) {
	f, err := os.Open(vocabPath)
	if err != nil {
		return nil, fmt.Errorf("open vocab: %w", err)
	}
	defer f.Close()

	vocab := make(map[string]int32)
	scanner := bufio.NewScanner(f)
	var id int32
	for scanner.Scan() {
		token := scanner.Text()
		vocab[token] = id
		id++
	}
	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("read vocab: %w", err)
	}

	lookup := func(tok string) int32 {
		if v, ok := vocab[tok]; ok {
			return v
		}
		return 0 // [UNK]
	}

	return &WordPieceTokenizer{
		vocab:  vocab,
		unkID:  lookup("[UNK]"),
		clsID:  lookup("[CLS]"),
		sepID:  lookup("[SEP]"),
		padID:  lookup("[PAD]"),
		maxLen: maxLen,
	}, nil
}

// tokenize splits text into WordPiece token IDs.
func (t *WordPieceTokenizer) tokenize(text string) []int32 {
	text = strings.ToLower(text)
	words := splitOnPunct(text)

	var ids []int32
	for _, word := range words {
		word = strings.TrimSpace(word)
		if word == "" {
			continue
		}
		subIDs := t.wordPiece(word)
		ids = append(ids, subIDs...)
	}
	return ids
}

func (t *WordPieceTokenizer) wordPiece(word string) []int32 {
	if _, ok := t.vocab[word]; ok {
		return []int32{t.vocab[word]}
	}

	var ids []int32
	start := 0
	for start < len(word) {
		end := len(word)
		found := false
		for end > start {
			sub := word[start:end]
			if start > 0 {
				sub = "##" + sub
			}
			if id, ok := t.vocab[sub]; ok {
				ids = append(ids, id)
				start = end
				found = true
				break
			}
			end--
		}
		if !found {
			ids = append(ids, t.unkID)
			start++
		}
	}
	return ids
}

// EncodePair formats a query-document pair as [CLS] query [SEP] doc [SEP],
// truncating the doc side to fit maxLen, and returns padded int64 tensors.
func (t *WordPieceTokenizer) EncodePair(query, doc string) (inputIDs, attentionMask, tokenTypeIDs []int64) {
	qTokens := t.tokenize(query)
	dTokens := t.tokenize(doc)

	// Reserve 3 slots for [CLS], [SEP], [SEP]
	maxDocLen := t.maxLen - len(qTokens) - 3
	if maxDocLen < 0 {
		// Query itself is too long, truncate it
		qTokens = qTokens[:t.maxLen-3]
		maxDocLen = 0
	}
	if len(dTokens) > maxDocLen {
		dTokens = dTokens[:maxDocLen]
	}

	// Build sequence: [CLS] q_tokens [SEP] d_tokens [SEP]
	seqLen := 3 + len(qTokens) + len(dTokens)
	inputIDs = make([]int64, t.maxLen)
	attentionMask = make([]int64, t.maxLen)
	tokenTypeIDs = make([]int64, t.maxLen)

	idx := 0
	inputIDs[idx] = int64(t.clsID)
	attentionMask[idx] = 1
	idx++

	for _, id := range qTokens {
		inputIDs[idx] = int64(id)
		attentionMask[idx] = 1
		idx++
	}

	inputIDs[idx] = int64(t.sepID)
	attentionMask[idx] = 1
	idx++

	for _, id := range dTokens {
		inputIDs[idx] = int64(id)
		attentionMask[idx] = 1
		tokenTypeIDs[idx] = 1 // segment B
		idx++
	}

	inputIDs[idx] = int64(t.sepID)
	attentionMask[idx] = 1
	tokenTypeIDs[idx] = 1
	idx++

	// Remaining positions are already zero (padded)
	_ = seqLen

	return inputIDs, attentionMask, tokenTypeIDs
}

// splitOnPunct splits text on whitespace and punctuation boundaries.
func splitOnPunct(text string) []string {
	var tokens []string
	var current strings.Builder
	for _, r := range text {
		if unicode.IsSpace(r) {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
		} else if unicode.IsPunct(r) || unicode.IsSymbol(r) {
			if current.Len() > 0 {
				tokens = append(tokens, current.String())
				current.Reset()
			}
			tokens = append(tokens, string(r))
		} else {
			current.WriteRune(r)
		}
	}
	if current.Len() > 0 {
		tokens = append(tokens, current.String())
	}
	return tokens
}
