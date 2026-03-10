package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"google.golang.org/genai"
)

// RewrittenArticle is the output of the Gemini rewriter.
type RewrittenArticle struct {
	Title    string
	Content  string // markdown
	Category string
	Summary  string
}

// Rewriter uses Gemini to transform source material into localized Finnish articles.
type Rewriter struct {
	client *genai.Client
	model  string
}

func NewRewriter(client *genai.Client, model string) *Rewriter {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &Rewriter{client: client, model: model}
}

var rewriteTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{{
		Name:        "submit_localized_article",
		Description: "Submit the rewritten, localized article for Espoo residents",
		Parameters: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"title":    {Type: genai.TypeString, Description: "Article headline in Finnish"},
				"content":  {Type: genai.TypeString, Description: "Full article in Finnish markdown (3-8 paragraphs)"},
				"category": {Type: genai.TypeString, Enum: []string{"council", "schools", "business", "events", "sports", "community", "culture", "safety", "health", "environment"}},
				"summary":  {Type: genai.TypeString, Description: "1-2 sentence summary in Finnish"},
			},
			Required: []string{"title", "content", "category", "summary"},
		},
	}},
}

var sourcePrompts = map[string]string{
	"wikipedia": `Kirjoita tietoteksti (knowledge article) tästä aiheesta.
Muuta tämä tietosanakirja-aihe kiinnostavaksi ja opettavaiseksi artikkeliksi Espoon paikallislehteen.
Etsi luonnollisia yhteyksiä Espooseen, Suomeen tai paikalliseen elämään.
ÄLÄ keksi paikallisia tapahtumia. Jos aiheella ei ole luonnollista paikallista kulmaa, kirjoita se yleiseksi tietoartikkeliksi joka kiinnostaa espoolaisia lukijoita.
Artikkelin tulee olla informatiivinen ja helppolukuinen.`,

	"yle": `Muunna tämä uutinen paikalliseksi artikkeliksi Espoon lukijoille.
Jos uutinen vaikuttaa suoraan espoolaisiin, korosta sitä näkökulmaa.
Jos kyseessä on valtakunnallinen tai kansainvälinen uutinen, kehystä se siitä näkökulmasta mitä se merkitsee espoolaisille asukkaille.
Säilytä journalistinen sävy ja tarkkuus. Älä keksi faktoja.`,

	"seiska": `Muunna tämä viihde-/julkkisuutinen hauskaksi ja kevyeksi paikallisartikkeliksi.
Pidä se viihdyttävänä mutta hyvän maun rajoissa.
Jos löydät Espoo-kulman, korosta sitä.
Käytä rentoa, tabloid-tyylistä sävyä. Tee siitä hauska luettava.`,

	"iltasanomat": `Muunna tämä uutinen paikalliseksi artikkeliksi Espoon lukijoille.
Tasapainota informatiivinen raportointi ja paikallinen relevanssi.
Säilytä tarkkuus mutta tee siitä paikallista journalismia.
Kirjoita selkeällä ja vetävällä tyylillä.`,

	"iltalehti": `Muunna tämä uutinen vetäväksi paikallisartikkeliksi Espoon lukijoille.
Käytä kiinnostavaa ja mukaansatempaavaa sävyä.
Korosta inhimillisiä näkökulmia ja human-interest -kulmaa.
Jos aiheessa on paikallinen kytkös, tuo se esiin.`,

	"kauppalehti": `Muunna tämä talousuutinen paikalliseksi bisnesartikkeliksi Espoon lukijoille.
Korosta taloudellisia vaikutuksia paikallisiin yrityksiin ja asukkaisiin.
Käytä ammattimaista sävyä. Selitä taloudelliset käsitteet selkeästi.
Tee aiheesta relevantti tavalliselle espoolaiselle lukijalle.`,
}

const baseSystemPrompt = `Olet paikallislehden toimittaja Espoossa, Suomessa. Kirjoitat artikkeleita espoolaisille lukijoille.

Säännöt:
- Kirjoita AINA suomeksi
- Artikkeli on 3-8 kappaletta pitkä, markdown-muodossa
- Otsikon tulee olla napakka ja kiinnostava
- Älä keksi faktoja tai tapahtumia joita lähdemateriaalissa ei ole
- Älä käytä sanoja: järkyttävä, uskomaton, dramaattinen, shokeeraava
- Artikkelin tulee tuntua aidolta paikallislehden jutulta
- Käytä submit_localized_article -työkalua artikkelin lähettämiseen

`

// Rewrite transforms a RawItem into a localized Finnish article using Gemini.
func (r *Rewriter) Rewrite(ctx context.Context, item RawItem) (*RewrittenArticle, error) {
	directive, ok := sourcePrompts[item.SourceName]
	if !ok {
		directive = sourcePrompts["yle"] // default to news style
	}

	systemPrompt := baseSystemPrompt + directive

	userPrompt := fmt.Sprintf("Lähde: %s\nOtsikko: %s\n\nSisältö:\n%s",
		item.SourceName, item.Title, item.FullText)
	if item.OriginalURL != "" {
		userPrompt += fmt.Sprintf("\n\nAlkuperäinen lähde: %s", item.OriginalURL)
	}

	resp, err := r.client.Models.GenerateContent(ctx, r.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(systemPrompt)},
			},
			Tools: []*genai.Tool{rewriteTool},
			ToolConfig: &genai.ToolConfig{
				FunctionCallingConfig: &genai.FunctionCallingConfig{
					Mode: genai.FunctionCallingConfigModeAny,
				},
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini rewrite: %w", err)
	}

	// Extract function call
	args, err := extractFuncArgs(resp)
	if err != nil {
		return nil, fmt.Errorf("gemini rewrite: %w", err)
	}

	var result struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		Category string `json:"category"`
		Summary  string `json:"summary"`
	}
	data, _ := json.Marshal(args)
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("unmarshal rewrite result: %w", err)
	}

	if result.Title == "" || result.Content == "" {
		return nil, fmt.Errorf("gemini returned empty title or content")
	}

	// Validate category
	if !validCategory(result.Category) {
		result.Category = "community"
	}

	return &RewrittenArticle{
		Title:    strings.TrimSpace(result.Title),
		Content:  strings.TrimSpace(result.Content),
		Category: result.Category,
		Summary:  strings.TrimSpace(result.Summary),
	}, nil
}

func extractFuncArgs(resp *genai.GenerateContentResponse) (map[string]any, error) {
	if resp == nil || len(resp.Candidates) == 0 {
		return nil, fmt.Errorf("empty response")
	}
	cand := resp.Candidates[0]
	if cand.Content == nil {
		return nil, fmt.Errorf("no content in response")
	}
	for _, part := range cand.Content.Parts {
		if part.FunctionCall != nil {
			return part.FunctionCall.Args, nil
		}
	}
	return nil, fmt.Errorf("no function call in response")
}

var validCategories = map[string]bool{
	"council": true, "schools": true, "business": true, "events": true,
	"sports": true, "community": true, "culture": true, "safety": true,
	"health": true, "environment": true,
}

func validCategory(cat string) bool {
	return validCategories[cat]
}

// ValidCategory is exported for testing.
func ValidCategory(cat string) bool {
	return validCategories[cat]
}
