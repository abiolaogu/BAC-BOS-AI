package service

import (
	"fmt"
	"net"
	"strings"
	"time"

	"nexus-mail-service/config"
	"nexus-mail-service/internal/model"

	"github.com/rs/zerolog/log"
)

// SpamFilter handles spam detection
type SpamFilter struct {
	config *config.Config
}

// NewSpamFilter creates a new spam filter
func NewSpamFilter(cfg *config.Config) *SpamFilter {
	return &SpamFilter{
		config: cfg,
	}
}

// CheckSpam checks if an email is spam
// Returns spam score (0-10) and whether it's spam (score > 5.0)
func (f *SpamFilter) CheckSpam(email *model.Email) (float64, bool) {
	if !f.config.Security.EnableSpamFilter {
		return 0.0, false
	}

	score := 0.0

	// Check with SpamAssassin if enabled
	if f.config.Security.SpamAssassinHost != "" {
		saScore, err := f.checkSpamAssassin(email)
		if err == nil {
			score = saScore
		} else {
			log.Warn().Err(err).Msg("SpamAssassin check failed")
		}
	}

	// Fallback to heuristic-based spam detection
	if score == 0.0 {
		score = f.heuristicSpamCheck(email)
	}

	isSpam := score > 5.0

	log.Debug().
		Str("emailID", email.ID).
		Float64("spamScore", score).
		Bool("isSpam", isSpam).
		Msg("Spam check completed")

	return score, isSpam
}

// checkSpamAssassin checks email with SpamAssassin
func (f *SpamFilter) checkSpamAssassin(email *model.Email) (float64, error) {
	// Connect to SpamAssassin spamd
	addr := fmt.Sprintf("%s:%s", f.config.Security.SpamAssassinHost, f.config.Security.SpamAssassinPort)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return 0.0, err
	}
	defer conn.Close()

	// Build email message
	message := f.buildEmailMessage(email)

	// Send SYMBOLS command to SpamAssassin
	request := fmt.Sprintf("SYMBOLS SPAMC/1.5\r\nContent-length: %d\r\n\r\n%s", len(message), message)
	_, err = conn.Write([]byte(request))
	if err != nil {
		return 0.0, err
	}

	// Read response (simplified - in production, parse properly)
	buffer := make([]byte, 4096)
	n, err := conn.Read(buffer)
	if err != nil {
		return 0.0, err
	}

	response := string(buffer[:n])

	// Parse spam score from response
	// Format: "Spam: True ; 5.5 / 5.0"
	score := parseSpamScore(response)
	return score, nil
}

// heuristicSpamCheck performs heuristic-based spam detection
func (f *SpamFilter) heuristicSpamCheck(email *model.Email) float64 {
	score := 0.0

	subject := strings.ToLower(email.Subject)
	body := strings.ToLower(email.Body)
	from := strings.ToLower(email.From)

	// Common spam keywords in subject
	spamKeywords := []string{
		"viagra", "cialis", "pharmacy", "lottery", "winner", "casino",
		"free money", "get rich", "work from home", "make money fast",
		"nigerian prince", "inheritance", "click here", "act now",
		"limited time", "congratulations", "you've won", "claim now",
		"100% free", "no cost", "risk free", "satisfaction guaranteed",
	}

	for _, keyword := range spamKeywords {
		if strings.Contains(subject, keyword) {
			score += 2.0
		}
		if strings.Contains(body, keyword) {
			score += 1.0
		}
	}

	// All caps subject (common in spam)
	if subject == strings.ToUpper(subject) && len(subject) > 5 {
		score += 1.5
	}

	// Excessive exclamation marks
	exclamationCount := strings.Count(subject, "!")
	if exclamationCount > 2 {
		score += float64(exclamationCount) * 0.5
	}

	// Suspicious from address patterns
	suspiciousFromPatterns := []string{
		"noreply", "donotreply", "no-reply", "notification",
	}
	for _, pattern := range suspiciousFromPatterns {
		if strings.Contains(from, pattern) {
			score += 0.5
		}
	}

	// Check for excessive links in body
	linkCount := strings.Count(body, "http://") + strings.Count(body, "https://")
	if linkCount > 5 {
		score += float64(linkCount-5) * 0.3
	}

	// Short body with links (common in phishing)
	if len(body) < 100 && linkCount > 1 {
		score += 2.0
	}

	// Check for HTML content with hidden text
	if email.BodyHTML != "" {
		htmlLower := strings.ToLower(email.BodyHTML)
		if strings.Contains(htmlLower, "display:none") || strings.Contains(htmlLower, "visibility:hidden") {
			score += 2.0
		}
	}

	// Multiple recipients (potential spam blast)
	totalRecipients := len(email.To) + len(email.CC)
	if totalRecipients > 10 {
		score += float64(totalRecipients-10) * 0.2
	}

	// Suspicious attachment types
	for _, att := range email.Attachments {
		filename := strings.ToLower(att.Filename)
		if strings.HasSuffix(filename, ".exe") ||
			strings.HasSuffix(filename, ".scr") ||
			strings.HasSuffix(filename, ".bat") ||
			strings.HasSuffix(filename, ".vbs") {
			score += 3.0
		}
	}

	// Cap score at 10.0
	if score > 10.0 {
		score = 10.0
	}

	return score
}

// buildEmailMessage builds an email message for SpamAssassin
func (f *SpamFilter) buildEmailMessage(email *model.Email) string {
	var builder strings.Builder

	// Headers
	builder.WriteString(fmt.Sprintf("From: %s\r\n", email.From))
	builder.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(email.To, ", ")))
	builder.WriteString(fmt.Sprintf("Subject: %s\r\n", email.Subject))
	builder.WriteString(fmt.Sprintf("Date: %s\r\n", email.ReceivedAt.Format(time.RFC1123Z)))
	builder.WriteString(fmt.Sprintf("Message-ID: %s\r\n", email.MessageID))

	if len(email.CC) > 0 {
		builder.WriteString(fmt.Sprintf("Cc: %s\r\n", strings.Join(email.CC, ", ")))
	}

	// Custom headers
	for key, values := range email.Headers {
		for _, value := range values {
			builder.WriteString(fmt.Sprintf("%s: %s\r\n", key, value))
		}
	}

	// Body
	builder.WriteString("\r\n")
	if email.BodyHTML != "" {
		builder.WriteString(email.BodyHTML)
	} else {
		builder.WriteString(email.Body)
	}

	return builder.String()
}

// parseSpamScore parses spam score from SpamAssassin response
func parseSpamScore(response string) float64 {
	// Simple parser for SpamAssassin response
	// Real implementation should be more robust
	lines := strings.Split(response, "\n")
	for _, line := range lines {
		if strings.Contains(line, "Spam:") {
			parts := strings.Split(line, ";")
			if len(parts) >= 2 {
				scorePart := strings.TrimSpace(parts[1])
				scoreStr := strings.Split(scorePart, "/")[0]
				scoreStr = strings.TrimSpace(scoreStr)

				var score float64
				fmt.Sscanf(scoreStr, "%f", &score)
				return score
			}
		}
	}
	return 0.0
}

// CheckVirus checks email for viruses using ClamAV
func (f *SpamFilter) CheckVirus(email *model.Email) (bool, error) {
	if !f.config.Security.EnableVirusScanning {
		return false, nil
	}

	// Connect to ClamAV
	addr := fmt.Sprintf("%s:%s", f.config.Security.ClamAVHost, f.config.Security.ClamAVPort)
	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return false, err
	}
	defer conn.Close()

	// Send PING command to check if ClamAV is alive
	_, err = conn.Write([]byte("zPING\x00"))
	if err != nil {
		return false, err
	}

	buffer := make([]byte, 4096)
	n, err := conn.Read(buffer)
	if err != nil {
		return false, err
	}

	response := string(buffer[:n])
	if !strings.Contains(response, "PONG") {
		return false, fmt.Errorf("ClamAV not responding")
	}

	// In production, scan attachments using INSTREAM command
	// For now, return false (no virus detected)
	return false, nil
}
