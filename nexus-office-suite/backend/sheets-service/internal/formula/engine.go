package formula

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

type Engine struct {
	functions map[string]FormulaFunc
}

type FormulaFunc func(args []interface{}) (interface{}, error)

type CellRef struct {
	Sheet  string
	Row    int
	Column int
}

type RangeRef struct {
	Sheet     string
	StartRow  int
	StartCol  int
	EndRow    int
	EndCol    int
}

func NewEngine() *Engine {
	e := &Engine{
		functions: make(map[string]FormulaFunc),
	}
	e.registerBuiltInFunctions()
	return e
}

// Evaluate evaluates a formula and returns the result
func (e *Engine) Evaluate(formula string, cellGetter func(row, col int) (interface{}, error)) (interface{}, error) {
	// Remove leading '=' if present
	formula = strings.TrimPrefix(formula, "=")
	formula = strings.TrimSpace(formula)

	// Parse and evaluate the formula
	return e.evaluateExpression(formula, cellGetter)
}

func (e *Engine) evaluateExpression(expr string, cellGetter func(row, col int) (interface{}, error)) (interface{}, error) {
	expr = strings.TrimSpace(expr)

	// Check if it's a function call
	if strings.Contains(expr, "(") {
		return e.evaluateFunction(expr, cellGetter)
	}

	// Check if it's a cell reference (e.g., A1, B2)
	if matched, _ := regexp.MatchString(`^[A-Z]+[0-9]+$`, expr); matched {
		return e.evaluateCellRef(expr, cellGetter)
	}

	// Check if it's a range (e.g., A1:A10)
	if strings.Contains(expr, ":") {
		return nil, fmt.Errorf("range cannot be evaluated directly")
	}

	// Check if it's a number
	if num, err := strconv.ParseFloat(expr, 64); err == nil {
		return num, nil
	}

	// Check if it's a string literal
	if strings.HasPrefix(expr, "\"") && strings.HasSuffix(expr, "\"") {
		return strings.Trim(expr, "\""), nil
	}

	// Check if it's a boolean
	if expr == "TRUE" {
		return true, nil
	}
	if expr == "FALSE" {
		return false, nil
	}

	// Try to evaluate as arithmetic expression
	return e.evaluateArithmetic(expr, cellGetter)
}

func (e *Engine) evaluateFunction(expr string, cellGetter func(row, col int) (interface{}, error)) (interface{}, error) {
	// Extract function name and arguments
	openParen := strings.Index(expr, "(")
	if openParen == -1 {
		return nil, fmt.Errorf("invalid function syntax")
	}

	funcName := strings.ToUpper(strings.TrimSpace(expr[:openParen]))
	argsStr := expr[openParen+1 : len(expr)-1]

	// Get the function
	fn, exists := e.functions[funcName]
	if !exists {
		return nil, fmt.Errorf("unknown function: %s", funcName)
	}

	// Parse arguments
	args, err := e.parseArguments(argsStr, cellGetter)
	if err != nil {
		return nil, err
	}

	// Execute the function
	return fn(args)
}

func (e *Engine) parseArguments(argsStr string, cellGetter func(row, col int) (interface{}, error)) ([]interface{}, error) {
	if strings.TrimSpace(argsStr) == "" {
		return []interface{}{}, nil
	}

	// Split by commas (handle nested functions)
	args := []string{}
	current := ""
	depth := 0

	for _, char := range argsStr {
		if char == '(' {
			depth++
		} else if char == ')' {
			depth--
		} else if char == ',' && depth == 0 {
			args = append(args, current)
			current = ""
			continue
		}
		current += string(char)
	}
	if current != "" {
		args = append(args, current)
	}

	// Evaluate each argument
	result := []interface{}{}
	for _, arg := range args {
		arg = strings.TrimSpace(arg)

		// Check if it's a range
		if strings.Contains(arg, ":") {
			rangeValues, err := e.evaluateRange(arg, cellGetter)
			if err != nil {
				return nil, err
			}
			result = append(result, rangeValues)
		} else {
			val, err := e.evaluateExpression(arg, cellGetter)
			if err != nil {
				return nil, err
			}
			result = append(result, val)
		}
	}

	return result, nil
}

func (e *Engine) evaluateCellRef(ref string, cellGetter func(row, col int) (interface{}, error)) (interface{}, error) {
	row, col, err := ParseCellRef(ref)
	if err != nil {
		return nil, err
	}

	return cellGetter(row, col)
}

func (e *Engine) evaluateRange(rangeRef string, cellGetter func(row, col int) (interface{}, error)) ([]interface{}, error) {
	parts := strings.Split(rangeRef, ":")
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid range: %s", rangeRef)
	}

	startRow, startCol, err := ParseCellRef(strings.TrimSpace(parts[0]))
	if err != nil {
		return nil, err
	}

	endRow, endCol, err := ParseCellRef(strings.TrimSpace(parts[1]))
	if err != nil {
		return nil, err
	}

	values := []interface{}{}
	for row := startRow; row <= endRow; row++ {
		for col := startCol; col <= endCol; col++ {
			val, err := cellGetter(row, col)
			if err != nil {
				continue
			}
			if val != nil {
				values = append(values, val)
			}
		}
	}

	return values, nil
}

func (e *Engine) evaluateArithmetic(expr string, cellGetter func(row, col int) (interface{}, error)) (interface{}, error) {
	// Simple arithmetic evaluation (addition, subtraction, multiplication, division)
	// This is a simplified version - a real implementation would use a proper parser

	// Replace cell references with their values
	cellRefPattern := regexp.MustCompile(`[A-Z]+[0-9]+`)
	replacedExpr := cellRefPattern.ReplaceAllStringFunc(expr, func(ref string) string {
		val, err := e.evaluateCellRef(ref, cellGetter)
		if err != nil {
			return "0"
		}
		return fmt.Sprintf("%v", val)
	})

	// Try to evaluate as a simple expression
	// For production, use a proper expression parser/evaluator
	result, err := e.evaluateSimpleArithmetic(replacedExpr)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (e *Engine) evaluateSimpleArithmetic(expr string) (float64, error) {
	// This is a very simplified arithmetic evaluator
	// A production implementation would use a proper expression parser

	expr = strings.ReplaceAll(expr, " ", "")

	// Handle basic operations in order of precedence
	// For now, just try to parse as a number
	return strconv.ParseFloat(expr, 64)
}

// ParseCellRef parses a cell reference like "A1" and returns row and column indices (0-based)
func ParseCellRef(ref string) (row int, col int, err error) {
	ref = strings.ToUpper(strings.TrimSpace(ref))

	// Extract column letters and row numbers
	colStr := ""
	rowStr := ""

	for _, char := range ref {
		if char >= 'A' && char <= 'Z' {
			colStr += string(char)
		} else if char >= '0' && char <= '9' {
			rowStr += string(char)
		}
	}

	if colStr == "" || rowStr == "" {
		return 0, 0, fmt.Errorf("invalid cell reference: %s", ref)
	}

	// Convert column letters to index (A=0, B=1, ..., Z=25, AA=26, etc.)
	col = 0
	for i, char := range colStr {
		col += int(char-'A'+1) * int(math.Pow(26, float64(len(colStr)-i-1)))
	}
	col-- // Convert to 0-based

	// Convert row number to index (1-based to 0-based)
	row, err = strconv.Atoi(rowStr)
	if err != nil {
		return 0, 0, err
	}
	row-- // Convert to 0-based

	return row, col, nil
}

// ColumnIndexToLetter converts a column index to letter(s) (0=A, 25=Z, 26=AA, etc.)
func ColumnIndexToLetter(index int) string {
	result := ""
	index++ // Convert to 1-based

	for index > 0 {
		index--
		result = string(rune('A'+index%26)) + result
		index /= 26
	}

	return result
}

// Helper function to convert interface{} to float64
func toFloat64(val interface{}) (float64, error) {
	switch v := val.(type) {
	case float64:
		return v, nil
	case int:
		return float64(v), nil
	case string:
		return strconv.ParseFloat(v, 64)
	case bool:
		if v {
			return 1, nil
		}
		return 0, nil
	default:
		return 0, fmt.Errorf("cannot convert %T to float64", val)
	}
}

// flattenArgs flattens nested arrays/slices in arguments
func flattenArgs(args []interface{}) []interface{} {
	result := []interface{}{}

	for _, arg := range args {
		switch v := arg.(type) {
		case []interface{}:
			result = append(result, flattenArgs(v)...)
		default:
			result = append(result, v)
		}
	}

	return result
}
