package models

import "time"

// WebhookEndpoint represents a destination for webhook events
type WebhookEndpoint struct {
	ID             string     `json:"id" db:"id"`
	OrganizationID string     `json:"organization_id" db:"organization_id"`
	URL            string     `json:"url" db:"url"`
	Secret         string     `json:"secret" db:"secret"` // Used for HMAC signature
	Description    string     `json:"description" db:"description"`
	Events         string     `json:"events" db:"events"` // JSONB array of event types to subscribe to (e.g., ["*"] or ["user.created", "role.assigned"])
	IsActive       bool       `json:"is_active" db:"is_active"`
	Headers        string     `json:"headers" db:"headers"` // JSONB of custom headers
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt      *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// WebhookDelivery represents a record of an attempted webhook delivery
type WebhookDelivery struct {
	ID                string    `json:"id" db:"id"`
	WebhookEndpointID string    `json:"webhook_endpoint_id" db:"webhook_endpoint_id"`
	EventID           string    `json:"event_id" db:"event_id"` // Links to AuditEvent or internal event ID
	EventType         string    `json:"event_type" db:"event_type"`
	Payload           string    `json:"payload" db:"payload"`             // JSONB
	StatusCode        int       `json:"status_code" db:"status_code"`     // HTTP status code received
	ResponseBody      *string   `json:"response_body" db:"response_body"` // Response body truncated if necessary
	DurationMs        int       `json:"duration_ms" db:"duration_ms"`
	Success           bool      `json:"success" db:"success"`
	ErrorMessage      *string   `json:"error_message" db:"error_message"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

// WebhookEvent represents the payload sent to a webhook endpoint
type WebhookEvent struct {
	ID             string      `json:"id"`
	EventType      string      `json:"event_type"`
	OrganizationID string      `json:"organization_id"`
	CreatedAt      time.Time   `json:"created_at"`
	Data           interface{} `json:"data"`
}
