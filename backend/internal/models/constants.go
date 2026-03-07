package models

// --- Submission status ---

const (
	StatusDraft        int16 = 0 // just created, raw files saved
	StatusTranscribing int16 = 1 // audio being transcribed
	StatusGenerating   int16 = 2 // Gemini generating article
	StatusReviewing    int16 = 3 // Gemini reviewing article
	StatusReady        int16 = 4 // pipeline complete, awaiting publish decision
	StatusPublished    int16 = 5 // publicly visible
	StatusArchived     int16 = 6 // hidden by owner or editor
	StatusRefining     int16 = 7 // contributor submitted refinement, pipeline re-running
	StatusAppealed     int16 = 8 // contributor appealed RED gate, awaiting human review
	StatusResearching  int16 = 9 // researching context via web search
)

// --- Submission error codes (0 = no error) ---

const (
	ErrNone          int16 = 0
	ErrTranscription int16 = 1 // ElevenLabs call failed
	ErrGeneration    int16 = 2 // Gemini generation failed
	ErrReview        int16 = 3 // Gemini review failed
	ErrModeration    int16 = 4 // flagged by moderation
)

// --- Profile / Submission category tags (bitmask) ---

const (
	TagCouncil   int64 = 1 << 0  // local government, council meetings
	TagSchools   int64 = 1 << 1  // education, school boards
	TagBusiness  int64 = 1 << 2  // local business, economy
	TagEvents    int64 = 1 << 3  // community events, festivals
	TagSports    int64 = 1 << 4  // local sports
	TagCommunity int64 = 1 << 5  // neighborhood, volunteer, civic
	TagCulture   int64 = 1 << 6  // arts, music, heritage
	TagSafety    int64 = 1 << 7  // police, fire, public safety
	TagHealth    int64 = 1 << 8  // health, hospitals, public health
	TagEnviron   int64 = 1 << 9  // environment, parks, weather
)

// --- Entity categories (polymorphic type discriminator) ---

const (
	EntitySubmission int16 = 1
	EntityProfile    int16 = 2
	EntityLocation   int16 = 3
)

// --- OAuth providers ---

const (
	ProviderGoogle int16 = 1
)

// --- Follow target types ---

const (
	FollowLocation int16 = 1
	FollowProfile  int16 = 2
)

// --- Reaction target types ---

const (
	ReactionTargetSubmission int16 = 1
	ReactionTargetReply      int16 = 2
)

// --- Reaction kinds ---

const (
	ReactionLike    int16 = 1
	ReactionDislike int16 = -1
)

// --- Reply status ---

const (
	ReplyVisible int16 = 0
	ReplyHidden  int16 = 1 // hidden by moderator
	ReplyDeleted int16 = 2 // soft-deleted by author
)

// --- Location level ---

const (
	LevelContinent int16 = 0
	LevelCountry   int16 = 1
	LevelRegion    int16 = 2 // state, province, lan
	LevelCity      int16 = 3
)
