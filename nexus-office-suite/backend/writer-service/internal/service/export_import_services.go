// internal/service/export_import_services.go
package service

import (
	"bytes"
	"fmt"

	"go.uber.org/zap"

	"github.com/nexus/writer-service/internal/model"
)

// ExportService handles document export
type ExportService interface {
	ExportToPDF(doc *model.Document) ([]byte, error)
	ExportToDOCX(doc *model.Document) ([]byte, error)
	ExportToHTML(doc *model.Document) ([]byte, error)
	ExportToTXT(doc *model.Document) ([]byte, error)
	ExportToMarkdown(doc *model.Document) ([]byte, error)
}

type exportService struct {
	logger *zap.Logger
}

func NewExportService(logger *zap.Logger) ExportService {
	return &exportService{logger: logger}
}

func (s *exportService) ExportToPDF(doc *model.Document) ([]byte, error) {
	// TODO: Implement PDF export using unipdf library
	// For MVP, return placeholder
	html := s.convertToHTML(doc)
	s.logger.Info("Exporting to PDF", zap.String("documentId", doc.ID.String()))
	return []byte(html), nil
}

func (s *exportService) ExportToDOCX(doc *model.Document) ([]byte, error) {
	// TODO: Implement DOCX export using go-docx or similar
	s.logger.Info("Exporting to DOCX", zap.String("documentId", doc.ID.String()))
	return []byte("DOCX export placeholder"), nil
}

func (s *exportService) ExportToHTML(doc *model.Document) ([]byte, error) {
	html := s.convertToHTML(doc)
	return []byte(html), nil
}

func (s *exportService) ExportToTXT(doc *model.Document) ([]byte, error) {
	txt := s.convertToText(doc)
	return []byte(txt), nil
}

func (s *exportService) ExportToMarkdown(doc *model.Document) ([]byte, error) {
	md := s.convertToMarkdown(doc)
	return []byte(md), nil
}

func (s *exportService) convertToHTML(doc *model.Document) string {
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("<html><head><title>%s</title></head><body>", doc.Title))
	buf.WriteString(fmt.Sprintf("<h1>%s</h1>", doc.Title))

	// Simplified conversion
	for _, node := range doc.Content.Content {
		buf.WriteString(s.nodeToHTML(node))
	}

	buf.WriteString("</body></html>")
	return buf.String()
}

func (s *exportService) nodeToHTML(node model.ContentNode) string {
	switch node.Type {
	case "paragraph":
		return fmt.Sprintf("<p>%s</p>", s.extractText(node))
	case "heading":
		level := 1
		if node.Attrs != nil {
			if l, ok := (*node.Attrs)["level"].(float64); ok {
				level = int(l)
			}
		}
		return fmt.Sprintf("<h%d>%s</h%d>", level, s.extractText(node), level)
	default:
		return s.extractText(node)
	}
}

func (s *exportService) extractText(node model.ContentNode) string {
	var buf bytes.Buffer
	if node.Text != "" {
		buf.WriteString(node.Text)
	}
	for _, child := range node.Content {
		buf.WriteString(s.extractText(child))
	}
	return buf.String()
}

func (s *exportService) convertToText(doc *model.Document) string {
	var buf bytes.Buffer
	buf.WriteString(doc.Title + "\n\n")
	for _, node := range doc.Content.Content {
		buf.WriteString(s.extractText(node) + "\n")
	}
	return buf.String()
}

func (s *exportService) convertToMarkdown(doc *model.Document) string {
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("# %s\n\n", doc.Title))
	for _, node := range doc.Content.Content {
		buf.WriteString(s.nodeToMarkdown(node) + "\n")
	}
	return buf.String()
}

func (s *exportService) nodeToMarkdown(node model.ContentNode) string {
	switch node.Type {
	case "heading":
		level := 1
		if node.Attrs != nil {
			if l, ok := (*node.Attrs)["level"].(float64); ok {
				level = int(l)
			}
		}
		return fmt.Sprintf("%s %s", string(bytes.Repeat([]byte("#"), level)), s.extractText(node))
	case "paragraph":
		return s.extractText(node)
	default:
		return s.extractText(node)
	}
}

// ImportService handles document import
type ImportService interface {
	ImportFromDOCX(data []byte, title string) (*model.DocumentContent, error)
	ImportFromHTML(data []byte) (*model.DocumentContent, error)
}

type importService struct {
	logger *zap.Logger
}

func NewImportService(logger *zap.Logger) ImportService {
	return &importService{logger: logger}
}

func (s *importService) ImportFromDOCX(data []byte, title string) (*model.DocumentContent, error) {
	// TODO: Implement DOCX import
	s.logger.Info("Importing from DOCX")

	// Placeholder: Return basic content
	return &model.DocumentContent{
		Type: "doc",
		Content: []model.ContentNode{
			{
				Type: "paragraph",
				Content: []model.ContentNode{
					{Text: "Imported content from DOCX"},
				},
			},
		},
	}, nil
}

func (s *importService) ImportFromHTML(data []byte) (*model.DocumentContent, error) {
	// TODO: Implement HTML import with proper parsing
	s.logger.Info("Importing from HTML")

	return &model.DocumentContent{
		Type: "doc",
		Content: []model.ContentNode{
			{
				Type: "paragraph",
				Content: []model.ContentNode{
					{Text: string(data)},
				},
			},
		},
	}, nil
}
