package models

import (
	"time"

	"github.com/google/uuid"
)

type ProfileMeta struct {
	FirstName    string            `json:"first_name,omitempty"`
	LastName     string            `json:"last_name,omitempty"`
	Avatar       string            `json:"avatar,omitempty"`
	Bio          string            `json:"bio,omitempty"`
	About        string            `json:"about,omitempty"`
	Occupation   string            `json:"occupation,omitempty"`
	Organization string            `json:"organization,omitempty"`
	Tags         []string          `json:"tags,omitempty"`
	Phone        string            `json:"phone,omitempty"`
	Website      string            `json:"website,omitempty"`
	Links        map[string]string `json:"links,omitempty"`
	LastLoginAt  *time.Time        `json:"last_login_at,omitempty"`
	Language     string            `json:"language,omitempty"`
	NotifyEmail  bool              `json:"notify_email,omitempty"`
	NotifyPush   bool              `json:"notify_push,omitempty"`
}

type Profile struct {
	ID           uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileName  string             `gorm:"type:varchar(100);uniqueIndex;not null" json:"profile_name"`
	Email        string             `gorm:"type:varchar(320);uniqueIndex;not null" json:"email"`
	PasswordHash []byte             `gorm:"type:bytea" json:"-"`
	LocationID   *uuid.UUID         `gorm:"type:uuid;index" json:"location_id,omitempty"`
	ContinentID  *uuid.UUID         `gorm:"type:uuid;index" json:"continent_id,omitempty"`
	CountryID    *uuid.UUID         `gorm:"type:uuid;index" json:"country_id,omitempty"`
	RegionID     *uuid.UUID         `gorm:"type:uuid;index" json:"region_id,omitempty"`
	CityID       *uuid.UUID         `gorm:"type:uuid;index" json:"city_id,omitempty"`
	Role         int16              `gorm:"default:0;index" json:"role"`
	Permissions  int64              `gorm:"default:0" json:"permissions"`
	Tags         int64              `gorm:"default:0" json:"tags"`
	Public       bool               `gorm:"default:false" json:"public"`
	IsAdult      bool               `gorm:"default:false" json:"is_adult"`
	Meta         JSONB[ProfileMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	SearchVector string             `gorm:"type:tsvector" json:"-"`
	Timestamps
}

type RefreshTokenMeta struct {
	Device    string `json:"device,omitempty"`
	IP        string `json:"ip,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
}

type RefreshToken struct {
	ID        uuid.UUID               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID uuid.UUID               `gorm:"type:uuid;not null;index" json:"profile_id"`
	TokenHash []byte                  `gorm:"type:bytea;not null" json:"-"`
	ExpiresAt time.Time               `gorm:"not null;index" json:"expires_at"`
	Revoked   bool                    `gorm:"default:false" json:"revoked"`
	Meta      JSONB[RefreshTokenMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	CreatedAt time.Time               `gorm:"autoCreateTime" json:"created_at"`
}

type OAuthAccountMeta struct {
	AccessToken  string     `json:"-"`
	RefreshToken string     `json:"-"`
	Scopes       string     `json:"scopes,omitempty"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`
	DisplayName  string     `json:"display_name,omitempty"`
	AvatarURL    string     `json:"avatar_url,omitempty"`
}

type OAuthAccount struct {
	ID          uuid.UUID               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID   uuid.UUID               `gorm:"type:uuid;not null;index" json:"profile_id"`
	Provider    int16                   `gorm:"not null;uniqueIndex:idx_oauth_provider_uid" json:"provider"`
	ProviderUID string                  `gorm:"type:varchar(300);not null;uniqueIndex:idx_oauth_provider_uid" json:"provider_uid"`
	Meta        JSONB[OAuthAccountMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	Timestamps
}
