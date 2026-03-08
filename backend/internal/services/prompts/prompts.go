// Embedded prompt text files for the article engine.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Initial implementation
package prompts

import _ "embed"

//go:embed generation_system.txt
var GenerationSystem string

//go:embed review_system.txt
var ReviewSystem string

//go:embed photo_vision.txt
var PhotoVision string

//go:embed research_system.txt
var ResearchSystem string

//go:embed questioning_system.txt
var QuestioningSystem string
