package queries

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type WebhookQueries interface {
	CreateEndpoint(endpoint *models.WebhookEndpoint) error
	GetEndpoint(id string, orgID string) (*models.WebhookEndpoint, error)
	ListEndpoints(orgID string) ([]models.WebhookEndpoint, error)
	UpdateEndpoint(endpoint *models.WebhookEndpoint) error
	DeleteEndpoint(id string, orgID string) error
	RecordDelivery(delivery *models.WebhookDelivery) error
	GetActiveEndpointsByEvent(orgID string, eventType string) ([]models.WebhookEndpoint, error)
	WithTx(tx *sql.Tx) WebhookQueries
	WithContext(ctx context.Context) WebhookQueries
}

type webhookQueries struct {
	db     DBTX
	logger *logger.Logger
}

func (q *webhookQueries) CreateEndpoint(endpoint *models.WebhookEndpoint) error {
	if endpoint.ID == "" {
		endpoint.ID = uuid.New().String()
	}
	now := time.Now()
	endpoint.CreatedAt = now
	endpoint.UpdatedAt = now

	query := `
		INSERT INTO webhook_endpoints (id, organization_id, url, secret, description, events, is_active, headers, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := q.db.ExecContext(context.Background(), query, endpoint.ID, endpoint.OrganizationID, endpoint.URL, endpoint.Secret, endpoint.Description, endpoint.Events, endpoint.IsActive, endpoint.Headers, endpoint.CreatedAt, endpoint.UpdatedAt)
	if err != nil {
		q.logger.Error("Failed to create webhook endpoint: %v", err)
		return fmt.Errorf("failed to create webhook endpoint: %w", err)
	}

	return nil
}

func (q *webhookQueries) GetEndpoint(id string, orgID string) (*models.WebhookEndpoint, error) {
	query := `
		SELECT id, organization_id, url, secret, description, events, is_active, headers, created_at, updated_at, deleted_at
		FROM webhook_endpoints
		WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL
	`

	var endpoint models.WebhookEndpoint
	err := q.db.QueryRowContext(context.Background(), query, id, orgID).Scan(
		&endpoint.ID, &endpoint.OrganizationID, &endpoint.URL, &endpoint.Secret,
		&endpoint.Description, &endpoint.Events, &endpoint.IsActive, &endpoint.Headers,
		&endpoint.CreatedAt, &endpoint.UpdatedAt, &endpoint.DeletedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("webhook endpoint not found")
		}
		q.logger.Error("Failed to get webhook endpoint: %v", err)
		return nil, fmt.Errorf("failed to get webhook endpoint: %w", err)
	}

	return &endpoint, nil
}

func (q *webhookQueries) ListEndpoints(orgID string) ([]models.WebhookEndpoint, error) {
	query := `
		SELECT id, organization_id, url, secret, description, events, is_active, headers, created_at, updated_at, deleted_at
		FROM webhook_endpoints
		WHERE organization_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
	`

	rows, err := q.db.QueryContext(context.Background(), query, orgID)
	if err != nil {
		q.logger.Error("Failed to list webhook endpoints: %v", err)
		return nil, fmt.Errorf("failed to list webhook endpoints: %w", err)
	}
	defer rows.Close()

	var endpoints []models.WebhookEndpoint
	for rows.Next() {
		var endpoint models.WebhookEndpoint
		if err := rows.Scan(
			&endpoint.ID, &endpoint.OrganizationID, &endpoint.URL, &endpoint.Secret,
			&endpoint.Description, &endpoint.Events, &endpoint.IsActive, &endpoint.Headers,
			&endpoint.CreatedAt, &endpoint.UpdatedAt, &endpoint.DeletedAt,
		); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, endpoint)
	}

	return endpoints, nil
}

func (q *webhookQueries) UpdateEndpoint(endpoint *models.WebhookEndpoint) error {
	endpoint.UpdatedAt = time.Now()

	query := `
		UPDATE webhook_endpoints
		SET url = $1, secret = $2, description = $3, events = $4, is_active = $5, headers = $6, updated_at = $7
		WHERE id = $8 AND organization_id = $9 AND deleted_at IS NULL
	`

	result, err := q.db.ExecContext(context.Background(), query, endpoint.URL, endpoint.Secret, endpoint.Description, endpoint.Events, endpoint.IsActive, endpoint.Headers, endpoint.UpdatedAt, endpoint.ID, endpoint.OrganizationID)
	if err != nil {
		q.logger.Error("Failed to update webhook endpoint: %v", err)
		return fmt.Errorf("failed to update webhook endpoint: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("webhook endpoint not found")
	}

	return nil
}

func (q *webhookQueries) DeleteEndpoint(id string, orgID string) error {
	query := `
		UPDATE webhook_endpoints
		SET deleted_at = $1
		WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL
	`

	result, err := q.db.ExecContext(context.Background(), query, time.Now(), id, orgID)
	if err != nil {
		q.logger.Error("Failed to delete webhook endpoint: %v", err)
		return fmt.Errorf("failed to delete webhook endpoint: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("webhook endpoint not found")
	}

	return nil
}

func (q *webhookQueries) RecordDelivery(delivery *models.WebhookDelivery) error {
	if delivery.ID == "" {
		delivery.ID = uuid.New().String()
	}
	if delivery.CreatedAt.IsZero() {
		delivery.CreatedAt = time.Now()
	}

	query := `
		INSERT INTO webhook_deliveries (id, webhook_endpoint_id, event_id, event_type, payload, status_code, response_body, duration_ms, success, error_message, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`

	_, err := q.db.ExecContext(context.Background(), query, delivery.ID, delivery.WebhookEndpointID, delivery.EventID, delivery.EventType, delivery.Payload, delivery.StatusCode, delivery.ResponseBody, delivery.DurationMs, delivery.Success, delivery.ErrorMessage, delivery.CreatedAt)
	if err != nil {
		q.logger.Error("Failed to record webhook delivery: %v", err)
		return fmt.Errorf("failed to record webhook delivery: %w", err)
	}

	return nil
}

func (q *webhookQueries) GetActiveEndpointsByEvent(orgID string, eventType string) ([]models.WebhookEndpoint, error) {
	// A robust query using JSONB containment to match either a specific event or the wildcard "*"
	// `events` is a JSONB array, e.g. ["*"] or ["user.created"]
	query := `
		SELECT id, organization_id, url, secret, description, events, is_active, headers, created_at, updated_at, deleted_at
		FROM webhook_endpoints
		WHERE organization_id = $1
		  AND is_active = true
		  AND deleted_at IS NULL
		  AND (events ? $2 OR events ? '*')
	`

	rows, err := q.db.QueryContext(context.Background(), query, orgID, eventType)
	if err != nil {
		q.logger.Error("Failed to get active endpoints by event: %v", err)
		return nil, fmt.Errorf("failed to get active endpoints: %w", err)
	}
	defer rows.Close()

	var endpoints []models.WebhookEndpoint
	for rows.Next() {
		var endpoint models.WebhookEndpoint
		if err := rows.Scan(
			&endpoint.ID, &endpoint.OrganizationID, &endpoint.URL, &endpoint.Secret,
			&endpoint.Description, &endpoint.Events, &endpoint.IsActive, &endpoint.Headers,
			&endpoint.CreatedAt, &endpoint.UpdatedAt, &endpoint.DeletedAt,
		); err != nil {
			return nil, err
		}
		endpoints = append(endpoints, endpoint)
	}

	return endpoints, nil
}

// WithTx returns a copy of the WebhookQueries with a transaction applied
func (q *webhookQueries) WithTx(tx *sql.Tx) WebhookQueries {
	return &webhookQueries{
		db:     tx,
		logger: q.logger,
	}
}

// WithContext returns a copy of the WebhookQueries with a context applied
func (q *webhookQueries) WithContext(ctx context.Context) WebhookQueries {
	return &webhookQueries{
		db:     q.db,
		logger: q.logger,
	}
}

// NewWebhookQueries creates a new WebhookQueries
func NewWebhookQueries(db DBTX, redisClient *redis.Client, logger *logger.Logger) WebhookQueries {
	return &webhookQueries{
		db:     db,
		logger: logger,
	}
}
