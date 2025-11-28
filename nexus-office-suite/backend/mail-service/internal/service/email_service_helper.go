package service

import (
	"encoding/json"
	"fmt"
	"net/http"
)

// UserProfile represents the user profile data needed for email service
type UserProfile struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// getUserProfile fetches user profile from IDaaS
func (s *EmailService) getUserProfile(userID string) (*UserProfile, error) {
	url := fmt.Sprintf("%s/users/%s", s.config.IDaaS.URL, userID)
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to call IDaaS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("IDaaS returned status: %d", resp.StatusCode)
	}

	var result struct {
		Success bool        `json:"success"`
		Data    UserProfile `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &result.Data, nil
}
