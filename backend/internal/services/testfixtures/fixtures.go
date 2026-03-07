// Shared test fixtures for article engine tests.
//
// Plan: N/A
//
// Changes:
// - 2026-03-07: Initial implementation — test data from PROMPTS_SPEC.md
package testfixtures

import (
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

// --- Transcript / Notes test data from PROMPTS_SPEC.md 7 test cases ---

const TranscriptCouncilMeeting = `So I just got out of the council meeting, it was pretty heated. They voted on the school budget, 5-2 it passed. Korhonen and Laaksonen voted against it. Korhonen was really upset, she said 'our children deserve better than this.' There were like 30 or 40 parents there, some of them had signs. The meeting went about an hour over schedule. Oh and they also briefly discussed the new parking arrangements near Masala station but didn't vote on that.`
const NotesCouncilMeeting = "budget vote, school cuts, heated meeting, Kirkkonummi council"

const TranscriptBakery = `My neighbor Marja Korhonen, she's been baking Karelian pies for her family every Sunday for like 30 years. And last Saturday she finally opened her own bakery, it's on the corner of Kauppalankatu and Kirkkotie. I went to the opening and there was a line of maybe 20 people already there. She told me she never planned to open a business but her daughter kept saying 'mom everyone asks for your recipe, just sell them.' She's doing Karelian pies, cinnamon rolls, and coffee. She gets her flour from some farm in Lohja. Open Tuesday through Saturday 7 to 3.`
const NotesBakery = "new bakery, Marja's place, great pies"

const TranscriptThinClip = "Hey so there's a new coffee shop that opened on the main street, just noticed it on my way to work."

const TranscriptAccusation = `I'm pretty sure Matti Virtanen from the council has been stealing from the community fund. My friend told me he saw Virtanen take cash from the office last week. Everyone knows he's been doing this for years.`
const NotesAccusation = "Virtanen corruption"

const NotesOnly = "New playground opened at Veikkola park today. About 15 kids playing. Parents seemed happy. The old playground was torn down last year. Municipality spent 200k on the new one according to a sign at the entrance."

const TranscriptHostile = `I'm so sick of this. The Somali families on Kauppakatu, they're ruining the neighborhood. They're loud, they leave trash everywhere, nobody wants them here. They should go back where they came from. This used to be a nice Finnish neighborhood.`
const NotesHostile = "problems on Kauppakatu"

const TranscriptDogWhistle = `There have been some safety concerns near the Masala train station area. I've noticed more litter, some graffiti, and there was a broken window at the bus stop last week. My neighbor says she doesn't feel safe walking home after dark anymore. I know a lot of immigrant families have moved into the apartments near the station recently. I'm not saying it's connected, I'm just reporting what I see.`
const NotesDogWhistle = "safety issues Masala station, talk to police maybe"

// --- Factory functions ---

func GreenReview() *models.ReviewResult {
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "council voted 5-2", Evidence: "contributor stated vote result", Status: "SUPPORTED"},
		},
		Scores: models.QualityScores{
			Evidence:        0.8,
			Perspectives:    0.5,
			Representation:  0.7,
			EthicalFraming:  0.9,
			CulturalContext: 0.8,
			Manipulation:    0.95,
		},
		Gate:        "GREEN",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{},
		Coaching: models.Coaching{
			Celebration: "Strong opening with the vote result. The Korhonen quote captures the tension.",
			Suggestions: []string{"Do you know what the budget specifically cuts?"},
		},
	}
}

func YellowReview() *models.ReviewResult {
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "litter near station", Evidence: "contributor observation", Status: "SUPPORTED"},
		},
		Scores: models.QualityScores{
			Evidence:        0.6,
			Perspectives:    0.3,
			Representation:  0.4,
			EthicalFraming:  0.7,
			CulturalContext: 0.5,
			Manipulation:    0.8,
		},
		Gate:        "YELLOW",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{
			{Dimension: "REPRESENTATION", Description: "Only one perspective represented", Suggestion: "Add voices from station-area residents"},
		},
		Coaching: models.Coaching{
			Celebration: "Good factual observations — the specific details make this credible.",
			Suggestions: []string{"Have you talked to anyone who lives near the station?"},
		},
	}
}

func RedReview() *models.ReviewResult {
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "Virtanen stole money", Evidence: "unnamed friend", Status: "POSSIBLE_HALLUCINATION"},
		},
		Scores: models.QualityScores{
			Evidence:        0.2,
			Perspectives:    0.1,
			Representation:  0.2,
			EthicalFraming:  0.3,
			CulturalContext: 0.5,
			Manipulation:    0.4,
		},
		Gate: "RED",
		RedTriggers: []models.RedTrigger{
			{
				Dimension:  "EVIDENCE",
				Trigger:    "unattributed_accusation",
				Paragraph:  1,
				Sentence:   "Virtanen has been stealing from the community fund",
				FixOptions: []string{"Attribute to named source", "Reference public record", "Reframe as concerns"},
			},
		},
		YellowFlags: []models.YellowFlag{},
		Coaching: models.Coaching{
			Celebration: "You're paying attention to how public money is used.",
			Suggestions: []string{"A police report or council audit would make this publishable."},
		},
	}
}

func SampleMetadata() models.ArticleMetadata {
	return models.ArticleMetadata{
		ChosenStructure: "news_report",
		Category:        "council",
		Confidence:      0.7,
		MissingContext:  []string{"What specifically does the budget cut?"},
	}
}

func SampleGenerationOutput() (string, models.ArticleMetadata) {
	md := "# City Council Votes 5-2 on School Budget\n\nThe Kirkkonummi council passed the school budget in a contested 5-2 vote."
	return md, SampleMetadata()
}

var testLocationID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

func MakeSubmission(ownerID uuid.UUID, status int16, meta *models.SubmissionMeta) models.Submission {
	sub := models.Submission{
		ID:         uuid.New(),
		OwnerID:    ownerID,
		LocationID: testLocationID,
		Title:      "Test Submission",
		Status:     status,
	}
	if meta != nil {
		sub.Meta = models.JSONB[models.SubmissionMeta]{V: *meta}
	}
	return sub
}

func MakeActor(profileID uuid.UUID, role int, perm int64) services.Actor {
	return services.Actor{
		ProfileID: profileID,
		Role:      role,
		Perm:      perm,
	}
}

// ForbiddenCoachingWords returns words that must never appear in coaching output.
func ForbiddenCoachingWords() []string {
	return []string{
		"racist", "biased", "harmful", "offensive", "inappropriate",
		"violates", "problematic", "unacceptable", "discriminatory",
		"insensitive", "toxic",
	}
}

// RequiredCoachingWords returns words that should appear in coaching vocabulary.
func RequiredCoachingWords() []string {
	return []string{
		"perspective", "voice", "source", "story",
	}
}

// MakeTime returns a fixed time for deterministic tests.
func MakeTime() time.Time {
	return time.Date(2026, 3, 7, 12, 0, 0, 0, time.UTC)
}
