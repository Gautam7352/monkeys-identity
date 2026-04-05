package security

import (
	"fmt"
	"net"
	"net/url"
)

// ValidateWebhookURL checks if a URL is safe for webhooks, preventing SSRF
func ValidateWebhookURL(rawURL string) error {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL format: %v", err)
	}

	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return fmt.Errorf("URL scheme must be http or https")
	}

	ips, err := net.LookupIP(parsedURL.Hostname())
	if err != nil {
		return fmt.Errorf("failed to resolve hostname: %v", err)
	}

	for _, ip := range ips {
		if ip.IsPrivate() || ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsLinkLocalMulticast() || ip.IsUnspecified() {
			return fmt.Errorf("URL resolves to a private, loopback, or otherwise restricted IP address")
		}
	}

	return nil
}
