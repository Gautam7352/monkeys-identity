package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

type WebhookService interface {
	DispatchEvent(ctx context.Context, event models.WebhookEvent)
}

type webhookService struct {
	queries queries.WebhookQueries
	logger  *logger.Logger
	client  *http.Client
}

func NewWebhookService(q queries.WebhookQueries, l *logger.Logger) WebhookService {
	return &webhookService{
		queries: q,
		logger:  l,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *webhookService) DispatchEvent(ctx context.Context, event models.WebhookEvent) {
	endpoints, err := s.queries.GetActiveEndpointsByEvent(event.OrganizationID, event.EventType)
	if err != nil {
		s.logger.Error("Failed to fetch webhook endpoints for event %s: %v", event.EventType, err)
		return
	}

	if len(endpoints) == 0 {
		return // No endpoints interested in this event
	}

	payload, err := json.Marshal(event)
	if err != nil {
		s.logger.Error("Failed to marshal webhook event payload: %v", err)
		return
	}

	for _, endpoint := range endpoints {
		// Run delivery in goroutines to avoid blocking
		go s.deliverPayload(endpoint, event, payload)
	}
}

func (s *webhookService) deliverPayload(endpoint models.WebhookEndpoint, event models.WebhookEvent, payload []byte) {
	startTime := time.Now()

	req, err := http.NewRequest("POST", endpoint.URL, bytes.NewBuffer(payload))
	if err != nil {
		s.logger.Error("Failed to create webhook request for endpoint %s: %v", endpoint.ID, err)
		errStr := err.Error()
		s.recordDelivery(endpoint, event, payload, 0, nil, time.Since(startTime), false, &errStr)
		return
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Monkeys-IAM-Webhook/1.0")

	// Add HMAC signature
	signature := s.generateSignature(payload, endpoint.Secret)
	req.Header.Set("X-Monkeys-Signature", signature)

	// Add custom headers if configured
	if endpoint.Headers != "" && endpoint.Headers != "{}" {
		var headers map[string]string
		if err := json.Unmarshal([]byte(endpoint.Headers), &headers); err == nil {
			for k, v := range headers {
				req.Header.Set(k, v)
			}
		}
	}

	// Maximum 3 attempts
	maxRetries := 3
	var resp *http.Response
	var deliveryErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		resp, deliveryErr = s.client.Do(req)

		if deliveryErr == nil && resp.StatusCode >= 200 && resp.StatusCode < 300 {
			break // Success
		}

		if attempt < maxRetries {
			// Exponential backoff
			time.Sleep(time.Duration(attempt*2) * time.Second)
		}
	}

	duration := time.Since(startTime)
	success := false
	statusCode := 0
	var respBodyStr *string
	var errMsgStr string

	if deliveryErr != nil {
		errMsgStr = deliveryErr.Error()
	} else if resp != nil {
		statusCode = resp.StatusCode
		success = statusCode >= 200 && statusCode < 300

		// Read up to 1KB of response body
		bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		resp.Body.Close()

		if len(bodyBytes) > 0 {
			bodyStr := string(bodyBytes)
			respBodyStr = &bodyStr
		}

		if !success {
			errMsgStr = fmt.Sprintf("HTTP %d", statusCode)
		}
	}

	var finalErrMsg *string
	if errMsgStr != "" {
		finalErrMsg = &errMsgStr
	}

	s.recordDelivery(endpoint, event, payload, statusCode, respBodyStr, duration, success, finalErrMsg)
}

func (s *webhookService) generateSignature(payload []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hex.EncodeToString(mac.Sum(nil))
}

func (s *webhookService) recordDelivery(
	endpoint models.WebhookEndpoint,
	event models.WebhookEvent,
	payload []byte,
	statusCode int,
	responseBody *string,
	duration time.Duration,
	success bool,
	errorMessage *string,
) {
	delivery := &models.WebhookDelivery{
		WebhookEndpointID: endpoint.ID,
		EventID:           event.ID,
		EventType:         event.EventType,
		Payload:           string(payload),
		StatusCode:        statusCode,
		ResponseBody:      responseBody,
		DurationMs:        int(duration.Milliseconds()),
		Success:           success,
		ErrorMessage:      errorMessage,
	}

	if err := s.queries.RecordDelivery(delivery); err != nil {
		s.logger.Error("Failed to record webhook delivery for endpoint %s: %v", endpoint.ID, err)
	}
}
