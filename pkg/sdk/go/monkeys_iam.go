package monkeys_iam

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Config represents the SDK configuration
type Config struct {
	BaseURL string // e.g. "http://localhost:8080/api/v1"
	Token   string // JWT token or API Key
	Timeout time.Duration
}

// Client is the main entry point for the IAM API
type Client struct {
	config Config
	http   *http.Client
}

// NewClient creates a new Monkeys IAM client
func NewClient(cfg Config) *Client {
	if cfg.Timeout == 0 {
		cfg.Timeout = 10 * time.Second
	}
	return &Client{
		config: cfg,
		http: &http.Client{
			Timeout: cfg.Timeout,
		},
	}
}

// SetToken updates the client's token
func (c *Client) SetToken(token string) {
	c.config.Token = token
}

// LoginRequest payload
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponse payload
type LoginResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	UserID       string `json:"user_id"`
}

// Login authenticates a user and updates the client token
func (c *Client) Login(ctx context.Context, email, password string) (*LoginResponse, error) {
	reqBody := LoginRequest{
		Email:    email,
		Password: password,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.config.BaseURL+"/auth/login", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("login failed with status %d", resp.StatusCode)
	}

	var loginResp struct {
		Data LoginResponse `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	c.SetToken(loginResp.Data.Token)
	return &loginResp.Data, nil
}

// CheckPermissionRequest payload
type CheckPermissionRequest struct {
	Action   string `json:"action"`
	Resource string `json:"resource"`
}

// CheckPermissionResponse payload
type CheckPermissionResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// CheckPermission verifies if the current token has permission
func (c *Client) CheckPermission(ctx context.Context, action, resource string) (*CheckPermissionResponse, error) {
	reqBody := CheckPermissionRequest{
		Action:   action,
		Resource: resource,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to encode request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", c.config.BaseURL+"/authz/check", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, err
	}

	if err := c.addAuthHeader(req); err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyStr, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("permission check failed with status %d: %s", resp.StatusCode, string(bodyStr))
	}

	var permResp struct {
		Data CheckPermissionResponse `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&permResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &permResp.Data, nil
}

// UserProfile represents user profile data
type UserProfile struct {
	ID            string            `json:"id"`
	Username      string            `json:"username"`
	Email         string            `json:"email"`
	DisplayName   string            `json:"display_name"`
	OrganizationID string           `json:"organization_id"`
}

// GetUserProfile fetches a specific user profile
func (c *Client) GetUserProfile(ctx context.Context, userID string) (*UserProfile, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/users/%s/profile", c.config.BaseURL, userID), nil)
	if err != nil {
		return nil, err
	}

	if err := c.addAuthHeader(req); err != nil {
		return nil, err
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyStr, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to get user profile %d: %s", resp.StatusCode, string(bodyStr))
	}

	var profileResp struct {
		Data UserProfile `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&profileResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &profileResp.Data, nil
}

func (c *Client) addAuthHeader(req *http.Request) error {
	if c.config.Token == "" {
		return fmt.Errorf("authentication token is required")
	}
	req.Header.Set("Authorization", "Bearer "+c.config.Token)
	return nil
}
