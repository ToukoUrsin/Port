package agents

import (
	"context"
	"fmt"
	"log"

	"google.golang.org/genai"
)

// Agent represents a single AI-powered user simulation.
type Agent struct {
	persona   Persona
	client    *APIClient
	gemClient *genai.Client
	model     string
	maxIter   int
	logger    *log.Logger
}

func NewAgent(persona Persona, client *APIClient, gemClient *genai.Client, model string, maxIter int, logger *log.Logger) *Agent {
	return &Agent{
		persona:   persona,
		client:    client,
		gemClient: gemClient,
		model:     model,
		maxIter:   maxIter,
		logger:    logger,
	}
}

// Run executes the agent's exploration loop using Gemini multi-turn chat with function calling.
func (a *Agent) Run(ctx context.Context) error {
	a.logger.Printf("[%s] Starting agent session (%s)", a.persona.DisplayName, a.persona.ProfileName)

	session, err := a.gemClient.Chats.Create(ctx, a.model, &genai.GenerateContentConfig{
		SystemInstruction: &genai.Content{
			Parts: []*genai.Part{genai.NewPartFromText(a.persona.SystemPrompt)},
		},
		Tools: agentTools,
	}, nil)
	if err != nil {
		return fmt.Errorf("create chat: %w", err)
	}

	// Kick off the agent
	resp, err := session.SendMessage(ctx, *genai.NewPartFromText(
		"You're now active on the local news platform for Espoo. "+
			"FIRST: Check your notifications to see if anyone has liked your comments, replied to you, or interacted with your content. "+
			"If someone replied to your comment, read the article's comments and reply back to them naturally — have a conversation! "+
			"If someone liked your comment, you might check what they've been writing too. "+
			"THEN: Browse recent articles, read what catches your eye, like what you enjoy, and comment when you have something to say. "+
			"When reading articles, also check the comments — if someone said something interesting, reply to them using reply_to_comment. "+
			"When you feel you've done enough for this session, call the done tool.",
	))
	if err != nil {
		return fmt.Errorf("initial message: %w", err)
	}

	for i := 0; i < a.maxIter; i++ {
		funcCalls := extractAllFunctionCalls(resp)
		if len(funcCalls) == 0 {
			// Agent responded with text only — it's done
			if text := extractTextFromResp(resp); text != "" {
				a.logger.Printf("[%s] Agent said: %s", a.persona.ProfileName, truncate(text, 200))
			}
			break
		}

		var responseParts []genai.Part
		done := false

		for _, fc := range funcCalls {
			if fc.Name == "done" {
				done = true
				responseParts = append(responseParts,
					*genai.NewPartFromFunctionResponse(fc.Name, map[string]any{"status": "done"}))
				summary := strArg(fc.Args, "summary")
				a.logger.Printf("[%s] Done: %s", a.persona.ProfileName, summary)
				continue
			}

			result := executeTool(fc.Name, fc.Args, a.client, a.persona, a.logger)
			responseParts = append(responseParts,
				*genai.NewPartFromFunctionResponse(fc.Name, result))
		}

		if done {
			break
		}

		// Feed tool results back to Gemini
		resp, err = session.SendMessage(ctx, responseParts...)
		if err != nil {
			return fmt.Errorf("turn %d: %w", i+1, err)
		}
	}

	a.logger.Printf("[%s] Session complete", a.persona.DisplayName)
	return nil
}

// extractAllFunctionCalls returns all function calls from a Gemini response.
func extractAllFunctionCalls(resp *genai.GenerateContentResponse) []*genai.FunctionCall {
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return nil
	}
	var calls []*genai.FunctionCall
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.FunctionCall != nil {
			calls = append(calls, part.FunctionCall)
		}
	}
	return calls
}

// extractTextFromResp returns the first text part from a Gemini response.
func extractTextFromResp(resp *genai.GenerateContentResponse) string {
	if resp == nil || len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil {
		return ""
	}
	for _, part := range resp.Candidates[0].Content.Parts {
		if part.Text != "" {
			return part.Text
		}
	}
	return ""
}
