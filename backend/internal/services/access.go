package services

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
)

type AccessService struct {
	db *gorm.DB
}

func NewAccessService(db *gorm.DB) *AccessService {
	return &AccessService{db: db}
}

// Actor represents the authenticated user making the request.
type Actor struct {
	ProfileID uuid.UUID
	Role      int
	Perm      int64
}

func ActorFromContext(c *gin.Context) Actor {
	id, _ := c.Get("profile_id")
	role, _ := c.Get("role")
	perm, _ := c.Get("perm")
	idStr, _ := id.(string)
	pid, _ := uuid.Parse(idStr)
	roleVal, _ := role.(int)
	permVal, _ := perm.(int64)
	return Actor{
		ProfileID: pid,
		Role:      roleVal,
		Perm:      permVal,
	}
}

func (a Actor) IsAdmin() bool  { return a.Role >= 2 }
func (a Actor) IsEditor() bool { return a.Role >= 1 }
func (a Actor) HasPerm(flag int64) bool { return a.Perm&flag != 0 }

// --- Submission Access ---

func (s *AccessService) CanViewSubmission(actor Actor, sub *models.Submission) bool {
	if sub.Status == models.StatusPublished {
		return true
	}
	if sub.OwnerID == actor.ProfileID {
		return true
	}
	if actor.IsEditor() {
		return true
	}
	return s.isSubmissionContributor(sub.ID, actor.ProfileID)
}

func (s *AccessService) CanEditSubmission(actor Actor, sub *models.Submission) bool {
	if sub.OwnerID == actor.ProfileID && sub.Status != models.StatusPublished {
		return true
	}
	if actor.IsEditor() && sub.Status != models.StatusPublished {
		return true
	}
	if actor.IsAdmin() {
		return true
	}
	return false
}

func (s *AccessService) CanDeleteSubmission(actor Actor, sub *models.Submission) bool {
	if sub.OwnerID == actor.ProfileID && sub.Status != models.StatusPublished {
		return true
	}
	if actor.IsAdmin() {
		return true
	}
	return false
}

func (s *AccessService) CanStreamSubmission(actor Actor, sub *models.Submission) bool {
	return s.CanViewSubmission(actor, sub)
}

func (s *AccessService) CanPublishSubmission(actor Actor, sub *models.Submission) bool {
	if sub.Status != models.StatusReady {
		return false
	}
	if !actor.HasPerm(models.PermPublish) {
		return false
	}
	// Owners with PermPublish can publish their own submissions
	if sub.OwnerID == actor.ProfileID {
		return true
	}
	// Editors/admins with PermPublish can publish anyone's
	if actor.IsEditor() {
		return true
	}
	return false
}

func (s *AccessService) CanRefineSubmission(actor Actor, sub *models.Submission) bool {
	return actor.ProfileID == sub.OwnerID && sub.Status == models.StatusReady
}

func (s *AccessService) CanAppealSubmission(actor Actor, sub *models.Submission) bool {
	if actor.ProfileID != sub.OwnerID {
		return false
	}
	if sub.Status != models.StatusReady {
		return false
	}
	if sub.Meta.V.Review == nil || sub.Meta.V.Review.Gate != "RED" {
		return false
	}
	return true
}

func (s *AccessService) isSubmissionContributor(submissionID, profileID uuid.UUID) bool {
	var count int64
	s.db.Model(&models.SubmissionContributor{}).
		Where("submission_id = ? AND profile_id = ?", submissionID, profileID).
		Count(&count)
	return count > 0
}

// --- Profile Access ---

func (s *AccessService) CanViewProfile(actor Actor, profile *models.Profile) bool {
	if profile.Public {
		return true
	}
	if profile.ID == actor.ProfileID {
		return true
	}
	if actor.IsEditor() {
		return true
	}
	return false
}

func (s *AccessService) CanEditProfile(actor Actor, profile *models.Profile) bool {
	if profile.ID == actor.ProfileID {
		return true
	}
	if actor.IsAdmin() && actor.HasPerm(models.PermManageUsers) {
		return true
	}
	return false
}

func (s *AccessService) CanChangeRole(actor Actor, targetProfile *models.Profile, newRole int) bool {
	if targetProfile.ID == actor.ProfileID {
		return false
	}
	if !actor.IsAdmin() || !actor.HasPerm(models.PermManageUsers) {
		return false
	}
	if newRole >= actor.Role {
		return false
	}
	if int(targetProfile.Role) >= actor.Role {
		return false
	}
	return true
}

// --- Reply Access ---

func (s *AccessService) CanCreateReply(actor Actor, sub *models.Submission) bool {
	if sub.Status != models.StatusPublished {
		return false
	}
	return true
}

func (s *AccessService) CanEditReply(actor Actor, reply *models.Reply) bool {
	if reply.ProfileID == actor.ProfileID {
		return true
	}
	if actor.IsAdmin() {
		return true
	}
	return false
}

func (s *AccessService) CanDeleteReply(actor Actor, reply *models.Reply) bool {
	if reply.ProfileID == actor.ProfileID {
		return true
	}
	if actor.HasPerm(models.PermModerate) {
		return true
	}
	return false
}

func (s *AccessService) CanModerateReply(actor Actor) bool {
	return actor.HasPerm(models.PermModerate)
}

// --- Follow Access ---

func (s *AccessService) CanFollow(actor Actor) bool {
	return true
}

func (s *AccessService) CanDeleteFollow(actor Actor, follow *models.Follow) bool {
	if follow.ProfileID == actor.ProfileID {
		return true
	}
	if actor.IsAdmin() {
		return true
	}
	return false
}

// --- Location Access ---

func (s *AccessService) CanCreateLocation(actor Actor) bool {
	return actor.HasPerm(models.PermManageLocations)
}

func (s *AccessService) CanEditLocation(actor Actor) bool {
	return actor.HasPerm(models.PermManageLocations)
}
