package services

import (
	"strings"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"
	"github.com/the-monkeys/monkeys-identity/pkg/logger"
)

func TestMFAService_VerifyTOTP(t *testing.T) {
	l := logger.New("info")
	s := NewMFAService(l)

	secret := "JBSWY3DPEHPK3PXP" // Example secret in base32

	// Test with valid passcode
	passcode, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("Failed to generate TOTP code: %v", err)
	}

	if !s.VerifyTOTP(passcode, secret) {
		t.Errorf("VerifyTOTP() = false, want true for valid passcode")
	}

	// Test with invalid passcode
	if s.VerifyTOTP("000000", secret) {
		t.Errorf("VerifyTOTP() = true, want false for invalid passcode")
	}

	// Test with invalid secret
	if s.VerifyTOTP(passcode, "INVALIDSECRET") {
		t.Errorf("VerifyTOTP() = true, want false for invalid secret")
	}
}

func TestMFAService_GenerateTOTPSecret(t *testing.T) {
	l := logger.New("info")
	s := NewMFAService(l)

	userID := "user-123"
	email := "test@example.com"

	secret, url, qrCode, err := s.GenerateTOTPSecret(userID, email)
	if err != nil {
		t.Fatalf("GenerateTOTPSecret() error = %v", err)
	}

	if secret == "" {
		t.Error("GenerateTOTPSecret() returned empty secret")
	}

	if !strings.Contains(url, email) {
		t.Errorf("GenerateTOTPSecret() URL %q does not contain email %q", url, email)
	}

	if qrCode == "" {
		t.Error("GenerateTOTPSecret() returned empty QR code base64")
	}
}

func TestMFAService_GenerateBackupCodes(t *testing.T) {
	l := logger.New("info")
	s := NewMFAService(l)

	count := 5
	codes := s.GenerateBackupCodes(count)

	if len(codes) != count {
		t.Errorf("GenerateBackupCodes() returned %d codes, want %d", len(codes), count)
	}

	for _, code := range codes {
		if len(code) != 12 {
			t.Errorf("GenerateBackupCodes() code %q has length %d, want 12", code, len(code))
		}
	}

	if count > 1 && codes[0] == codes[1] {
		t.Error("GenerateBackupCodes() returned duplicate codes")
	}
}
