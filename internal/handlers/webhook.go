package handlers

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/the-monkeys/monkeys-identity/internal/models"
	"github.com/the-monkeys/monkeys-identity/internal/queries"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
	"github.com/the-monkeys/monkeys-identity/pkg/security"
)

type WebhookHandler struct {
	queries queries.WebhookQueries
	logger  *logger.Logger
}

func NewWebhookHandler(q queries.WebhookQueries, l *logger.Logger) *WebhookHandler {
	return &WebhookHandler{
		queries: q,
		logger:  l,
	}
}

// CreateWebhookEndpoint creates a new webhook endpoint for an organization
func (h *WebhookHandler) CreateEndpoint(c *fiber.Ctx) error {
	orgID := c.Locals("org_id").(string)

	var req models.WebhookEndpoint
	if err := c.BodyParser(&req); err != nil {
		h.logger.Error("Failed to parse request body: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid request payload",
		})
	}

	if err := security.ValidateWebhookURL(req.URL); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_url",
			Message: err.Error(),
		})
	}

	// Validate events JSON if present
	if req.Events != "" {
		var events []string
		if err := json.Unmarshal([]byte(req.Events), &events); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_request",
				Message: "Events must be a valid JSON array of strings",
			})
		}
	} else {
		// Default to all events if empty
		req.Events = `["*"]`
	}

	req.OrganizationID = orgID

	if err := h.queries.CreateEndpoint(&req); err != nil {
		h.logger.Error("Failed to create webhook endpoint: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create webhook endpoint",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(SuccessResponse{
		Status:  fiber.StatusCreated,
		Message: "Webhook endpoint created successfully",
		Data:    req,
	})
}

// ListEndpoints retrieves all webhook endpoints for an organization
func (h *WebhookHandler) ListEndpoints(c *fiber.Ctx) error {
	orgID := c.Locals("org_id").(string)

	endpoints, err := h.queries.ListEndpoints(orgID)
	if err != nil {
		h.logger.Error("Failed to list webhook endpoints: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve webhook endpoints",
		})
	}

	// Make sure we always return a JSON array instead of null
	if endpoints == nil {
		endpoints = []models.WebhookEndpoint{}
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Webhook endpoints retrieved successfully",
		Data:    endpoints,
	})
}

// GetEndpoint retrieves a specific webhook endpoint
func (h *WebhookHandler) GetEndpoint(c *fiber.Ctx) error {
	orgID := c.Locals("org_id").(string)
	id := c.Params("id")

	endpoint, err := h.queries.GetEndpoint(id, orgID)
	if err != nil {
		h.logger.Error("Failed to get webhook endpoint: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
			Error:   "not_found",
			Message: "Webhook endpoint not found",
		})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Webhook endpoint retrieved successfully",
		Data:    endpoint,
	})
}

// UpdateEndpoint updates an existing webhook endpoint
func (h *WebhookHandler) UpdateEndpoint(c *fiber.Ctx) error {
	orgID := c.Locals("org_id").(string)
	id := c.Params("id")

	var req models.WebhookEndpoint
	if err := c.BodyParser(&req); err != nil {
		h.logger.Error("Failed to parse request body: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
			Error:   "invalid_request",
			Message: "Invalid request payload",
		})
	}

		if err := security.ValidateWebhookURL(req.URL); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_url",
				Message: err.Error(),
			})
		}

	// Validate events JSON if present
	if req.Events != "" {
		var events []string
		if err := json.Unmarshal([]byte(req.Events), &events); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(ErrorResponse{
				Error:   "invalid_request",
				Message: "Events must be a valid JSON array of strings",
			})
		}
	}

	req.ID = id
	req.OrganizationID = orgID

	if err := h.queries.UpdateEndpoint(&req); err != nil {
		h.logger.Error("Failed to update webhook endpoint: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update webhook endpoint",
		})
	}

	// Fetch the updated endpoint to return it
	updatedEndpoint, _ := h.queries.GetEndpoint(id, orgID)

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Webhook endpoint updated successfully",
		Data:    updatedEndpoint,
	})
}

// DeleteEndpoint deletes a webhook endpoint
func (h *WebhookHandler) DeleteEndpoint(c *fiber.Ctx) error {
	orgID := c.Locals("org_id").(string)
	id := c.Params("id")

	if err := h.queries.DeleteEndpoint(id, orgID); err != nil {
		h.logger.Error("Failed to delete webhook endpoint: %v", err)
		return c.Status(fiber.StatusNotFound).JSON(ErrorResponse{
			Error:   "not_found",
			Message: "Webhook endpoint not found",
		})
	}

	return c.Status(fiber.StatusOK).JSON(SuccessResponse{
		Status:  fiber.StatusOK,
		Message: "Webhook endpoint deleted successfully",
	})
}
