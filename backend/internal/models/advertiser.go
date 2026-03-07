package models

import (
	"github.com/google/uuid"
)

type AdvertiserMeta struct {
	ContactName    string `json:"contact_name,omitempty"`
	ContactEmail   string `json:"contact_email,omitempty"`
	ContactPhone   string `json:"contact_phone,omitempty"`
	Logo           string `json:"logo,omitempty"`
	Website        string `json:"website,omitempty"`
	Description    string `json:"description,omitempty"`
	BillingEmail   string `json:"billing_email,omitempty"`
	BillingAddress string `json:"billing_address,omitempty"`
	VatID          string `json:"vat_id,omitempty"`
}

type Advertiser struct {
	ID          uuid.UUID             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name        string                `gorm:"type:varchar(300);not null" json:"name"`
	Status      int16                 `gorm:"default:0" json:"status"`
	Permissions int64                 `gorm:"default:0" json:"permissions"`
	Tags        int64                 `gorm:"default:0" json:"tags"`
	Meta        JSONB[AdvertiserMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	Timestamps
}
