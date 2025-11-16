package formula

import (
	"fmt"
	"math"
	"strings"
	"time"
)

func (e *Engine) registerBuiltInFunctions() {
	// Math functions
	e.functions["SUM"] = funcSum
	e.functions["AVERAGE"] = funcAverage
	e.functions["COUNT"] = funcCount
	e.functions["COUNTA"] = funcCountA
	e.functions["MIN"] = funcMin
	e.functions["MAX"] = funcMax
	e.functions["ROUND"] = funcRound
	e.functions["ROUNDUP"] = funcRoundUp
	e.functions["ROUNDDOWN"] = funcRoundDown
	e.functions["ABS"] = funcAbs
	e.functions["SQRT"] = funcSqrt
	e.functions["POWER"] = funcPower
	e.functions["MOD"] = funcMod
	e.functions["FLOOR"] = funcFloor
	e.functions["CEILING"] = funcCeiling
	e.functions["RAND"] = funcRand
	e.functions["RANDBETWEEN"] = funcRandBetween

	// Statistical functions
	e.functions["MEDIAN"] = funcMedian
	e.functions["MODE"] = funcMode
	e.functions["STDEV"] = funcStdev
	e.functions["VAR"] = funcVar

	// Logical functions
	e.functions["IF"] = funcIf
	e.functions["AND"] = funcAnd
	e.functions["OR"] = funcOr
	e.functions["NOT"] = funcNot
	e.functions["IFERROR"] = funcIfError

	// Text functions
	e.functions["CONCATENATE"] = funcConcatenate
	e.functions["CONCAT"] = funcConcatenate
	e.functions["LEFT"] = funcLeft
	e.functions["RIGHT"] = funcRight
	e.functions["MID"] = funcMid
	e.functions["LEN"] = funcLen
	e.functions["UPPER"] = funcUpper
	e.functions["LOWER"] = funcLower
	e.functions["TRIM"] = funcTrim
	e.functions["REPLACE"] = funcReplace
	e.functions["SUBSTITUTE"] = funcSubstitute

	// Date functions
	e.functions["TODAY"] = funcToday
	e.functions["NOW"] = funcNow
	e.functions["YEAR"] = funcYear
	e.functions["MONTH"] = funcMonth
	e.functions["DAY"] = funcDay
	e.functions["DATE"] = funcDate

	// Lookup functions
	e.functions["VLOOKUP"] = funcVlookup
	e.functions["HLOOKUP"] = funcHlookup
	e.functions["INDEX"] = funcIndex
	e.functions["MATCH"] = funcMatch
}

// Math Functions

func funcSum(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	sum := 0.0

	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			sum += val
		}
	}

	return sum, nil
}

func funcAverage(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	sum := 0.0
	count := 0

	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			sum += val
			count++
		}
	}

	if count == 0 {
		return nil, fmt.Errorf("no numeric values to average")
	}

	return sum / float64(count), nil
}

func funcCount(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	count := 0

	for _, arg := range args {
		if _, err := toFloat64(arg); err == nil {
			count++
		}
	}

	return float64(count), nil
}

func funcCountA(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	count := 0

	for _, arg := range args {
		if arg != nil && arg != "" {
			count++
		}
	}

	return float64(count), nil
}

func funcMin(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("MIN requires at least one argument")
	}

	min := math.MaxFloat64
	found := false

	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			if !found || val < min {
				min = val
				found = true
			}
		}
	}

	if !found {
		return nil, fmt.Errorf("no numeric values found")
	}

	return min, nil
}

func funcMax(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("MAX requires at least one argument")
	}

	max := -math.MaxFloat64
	found := false

	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			if !found || val > max {
				max = val
				found = true
			}
		}
	}

	if !found {
		return nil, fmt.Errorf("no numeric values found")
	}

	return max, nil
}

func funcRound(args []interface{}) (interface{}, error) {
	if len(args) < 1 || len(args) > 2 {
		return nil, fmt.Errorf("ROUND requires 1 or 2 arguments")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	decimals := 0.0
	if len(args) == 2 {
		decimals, err = toFloat64(args[1])
		if err != nil {
			return nil, err
		}
	}

	multiplier := math.Pow(10, decimals)
	return math.Round(val*multiplier) / multiplier, nil
}

func funcRoundUp(args []interface{}) (interface{}, error) {
	if len(args) < 1 || len(args) > 2 {
		return nil, fmt.Errorf("ROUNDUP requires 1 or 2 arguments")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	decimals := 0.0
	if len(args) == 2 {
		decimals, err = toFloat64(args[1])
		if err != nil {
			return nil, err
		}
	}

	multiplier := math.Pow(10, decimals)
	return math.Ceil(val*multiplier) / multiplier, nil
}

func funcRoundDown(args []interface{}) (interface{}, error) {
	if len(args) < 1 || len(args) > 2 {
		return nil, fmt.Errorf("ROUNDDOWN requires 1 or 2 arguments")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	decimals := 0.0
	if len(args) == 2 {
		decimals, err = toFloat64(args[1])
		if err != nil {
			return nil, err
		}
	}

	multiplier := math.Pow(10, decimals)
	return math.Floor(val*multiplier) / multiplier, nil
}

func funcAbs(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("ABS requires exactly 1 argument")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	return math.Abs(val), nil
}

func funcSqrt(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("SQRT requires exactly 1 argument")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	if val < 0 {
		return nil, fmt.Errorf("SQRT of negative number")
	}

	return math.Sqrt(val), nil
}

func funcPower(args []interface{}) (interface{}, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("POWER requires exactly 2 arguments")
	}

	base, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	exp, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}

	return math.Pow(base, exp), nil
}

func funcMod(args []interface{}) (interface{}, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("MOD requires exactly 2 arguments")
	}

	dividend, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	divisor, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}

	if divisor == 0 {
		return nil, fmt.Errorf("division by zero")
	}

	return math.Mod(dividend, divisor), nil
}

func funcFloor(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("FLOOR requires exactly 1 argument")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	return math.Floor(val), nil
}

func funcCeiling(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("CEILING requires exactly 1 argument")
	}

	val, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	return math.Ceil(val), nil
}

func funcRand(args []interface{}) (interface{}, error) {
	// Returns a random number between 0 and 1
	// Note: In production, use a seeded random generator
	return math.Round(float64(time.Now().UnixNano()%1000000)) / 1000000.0, nil
}

func funcRandBetween(args []interface{}) (interface{}, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("RANDBETWEEN requires exactly 2 arguments")
	}

	min, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	max, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}

	// Simple random number generator (use crypto/rand in production)
	rand := float64(time.Now().UnixNano()%1000000) / 1000000.0
	return math.Floor(min + rand*(max-min+1)), nil
}

// Statistical Functions

func funcMedian(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("MEDIAN requires at least one argument")
	}

	// Convert to float64 slice and sort
	values := []float64{}
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			values = append(values, val)
		}
	}

	if len(values) == 0 {
		return nil, fmt.Errorf("no numeric values found")
	}

	// Simple bubble sort (use sort.Float64s in production)
	for i := 0; i < len(values); i++ {
		for j := i + 1; j < len(values); j++ {
			if values[i] > values[j] {
				values[i], values[j] = values[j], values[i]
			}
		}
	}

	n := len(values)
	if n%2 == 0 {
		return (values[n/2-1] + values[n/2]) / 2, nil
	}
	return values[n/2], nil
}

func funcMode(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("MODE requires at least one argument")
	}

	// Count occurrences
	counts := make(map[float64]int)
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			counts[val]++
		}
	}

	if len(counts) == 0 {
		return nil, fmt.Errorf("no numeric values found")
	}

	// Find the mode
	maxCount := 0
	mode := 0.0
	for val, count := range counts {
		if count > maxCount {
			maxCount = count
			mode = val
		}
	}

	return mode, nil
}

func funcStdev(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) < 2 {
		return nil, fmt.Errorf("STDEV requires at least 2 arguments")
	}

	// Calculate mean
	sum := 0.0
	count := 0
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			sum += val
			count++
		}
	}

	if count < 2 {
		return nil, fmt.Errorf("insufficient numeric values")
	}

	mean := sum / float64(count)

	// Calculate variance
	variance := 0.0
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			variance += math.Pow(val-mean, 2)
		}
	}

	variance /= float64(count - 1)
	return math.Sqrt(variance), nil
}

func funcVar(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) < 2 {
		return nil, fmt.Errorf("VAR requires at least 2 arguments")
	}

	// Calculate mean
	sum := 0.0
	count := 0
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			sum += val
			count++
		}
	}

	if count < 2 {
		return nil, fmt.Errorf("insufficient numeric values")
	}

	mean := sum / float64(count)

	// Calculate variance
	variance := 0.0
	for _, arg := range args {
		val, err := toFloat64(arg)
		if err == nil {
			variance += math.Pow(val-mean, 2)
		}
	}

	return variance / float64(count-1), nil
}

// Logical Functions

func funcIf(args []interface{}) (interface{}, error) {
	if len(args) < 2 || len(args) > 3 {
		return nil, fmt.Errorf("IF requires 2 or 3 arguments")
	}

	condition, ok := args[0].(bool)
	if !ok {
		// Try to convert to bool
		val, err := toFloat64(args[0])
		if err == nil {
			condition = val != 0
		} else {
			condition = args[0] != nil && args[0] != ""
		}
	}

	if condition {
		return args[1], nil
	}

	if len(args) == 3 {
		return args[2], nil
	}

	return false, nil
}

func funcAnd(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("AND requires at least one argument")
	}

	for _, arg := range args {
		condition, ok := arg.(bool)
		if !ok {
			val, err := toFloat64(arg)
			if err == nil {
				condition = val != 0
			} else {
				condition = arg != nil && arg != ""
			}
		}

		if !condition {
			return false, nil
		}
	}

	return true, nil
}

func funcOr(args []interface{}) (interface{}, error) {
	args = flattenArgs(args)
	if len(args) == 0 {
		return nil, fmt.Errorf("OR requires at least one argument")
	}

	for _, arg := range args {
		condition, ok := arg.(bool)
		if !ok {
			val, err := toFloat64(arg)
			if err == nil {
				condition = val != 0
			} else {
				condition = arg != nil && arg != ""
			}
		}

		if condition {
			return true, nil
		}
	}

	return false, nil
}

func funcNot(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("NOT requires exactly 1 argument")
	}

	condition, ok := args[0].(bool)
	if !ok {
		val, err := toFloat64(args[0])
		if err == nil {
			condition = val != 0
		} else {
			condition = args[0] != nil && args[0] != ""
		}
	}

	return !condition, nil
}

func funcIfError(args []interface{}) (interface{}, error) {
	if len(args) != 2 {
		return nil, fmt.Errorf("IFERROR requires exactly 2 arguments")
	}

	// If first argument is an error, return second argument
	// This is simplified - in production, you'd evaluate the first arg and catch errors
	if args[0] == nil {
		return args[1], nil
	}

	return args[0], nil
}

// Text Functions

func funcConcatenate(args []interface{}) (interface{}, error) {
	result := ""
	for _, arg := range args {
		result += fmt.Sprintf("%v", arg)
	}
	return result, nil
}

func funcLeft(args []interface{}) (interface{}, error) {
	if len(args) < 1 || len(args) > 2 {
		return nil, fmt.Errorf("LEFT requires 1 or 2 arguments")
	}

	str := fmt.Sprintf("%v", args[0])
	count := 1
	if len(args) == 2 {
		c, err := toFloat64(args[1])
		if err != nil {
			return nil, err
		}
		count = int(c)
	}

	if count > len(str) {
		return str, nil
	}

	return str[:count], nil
}

func funcRight(args []interface{}) (interface{}, error) {
	if len(args) < 1 || len(args) > 2 {
		return nil, fmt.Errorf("RIGHT requires 1 or 2 arguments")
	}

	str := fmt.Sprintf("%v", args[0])
	count := 1
	if len(args) == 2 {
		c, err := toFloat64(args[1])
		if err != nil {
			return nil, err
		}
		count = int(c)
	}

	if count > len(str) {
		return str, nil
	}

	return str[len(str)-count:], nil
}

func funcMid(args []interface{}) (interface{}, error) {
	if len(args) != 3 {
		return nil, fmt.Errorf("MID requires exactly 3 arguments")
	}

	str := fmt.Sprintf("%v", args[0])

	start, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}
	startInt := int(start) - 1 // 1-based to 0-based

	count, err := toFloat64(args[2])
	if err != nil {
		return nil, err
	}
	countInt := int(count)

	if startInt < 0 || startInt >= len(str) {
		return "", nil
	}

	end := startInt + countInt
	if end > len(str) {
		end = len(str)
	}

	return str[startInt:end], nil
}

func funcLen(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("LEN requires exactly 1 argument")
	}

	str := fmt.Sprintf("%v", args[0])
	return float64(len(str)), nil
}

func funcUpper(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("UPPER requires exactly 1 argument")
	}

	str := fmt.Sprintf("%v", args[0])
	return strings.ToUpper(str), nil
}

func funcLower(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("LOWER requires exactly 1 argument")
	}

	str := fmt.Sprintf("%v", args[0])
	return strings.ToLower(str), nil
}

func funcTrim(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("TRIM requires exactly 1 argument")
	}

	str := fmt.Sprintf("%v", args[0])
	return strings.TrimSpace(str), nil
}

func funcReplace(args []interface{}) (interface{}, error) {
	if len(args) != 4 {
		return nil, fmt.Errorf("REPLACE requires exactly 4 arguments")
	}

	str := fmt.Sprintf("%v", args[0])

	start, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}
	startInt := int(start) - 1

	length, err := toFloat64(args[2])
	if err != nil {
		return nil, err
	}
	lengthInt := int(length)

	newText := fmt.Sprintf("%v", args[3])

	if startInt < 0 || startInt >= len(str) {
		return str, nil
	}

	end := startInt + lengthInt
	if end > len(str) {
		end = len(str)
	}

	return str[:startInt] + newText + str[end:], nil
}

func funcSubstitute(args []interface{}) (interface{}, error) {
	if len(args) < 3 || len(args) > 4 {
		return nil, fmt.Errorf("SUBSTITUTE requires 3 or 4 arguments")
	}

	str := fmt.Sprintf("%v", args[0])
	old := fmt.Sprintf("%v", args[1])
	new := fmt.Sprintf("%v", args[2])

	if len(args) == 4 {
		// Replace specific occurrence
		occurrence, err := toFloat64(args[3])
		if err != nil {
			return nil, err
		}
		occurrenceInt := int(occurrence)

		count := 0
		result := str
		for i := 0; i < len(str); i++ {
			if strings.HasPrefix(str[i:], old) {
				count++
				if count == occurrenceInt {
					result = str[:i] + new + str[i+len(old):]
					break
				}
			}
		}
		return result, nil
	}

	// Replace all occurrences
	return strings.ReplaceAll(str, old, new), nil
}

// Date Functions

func funcToday(args []interface{}) (interface{}, error) {
	return time.Now().Format("2006-01-02"), nil
}

func funcNow(args []interface{}) (interface{}, error) {
	return time.Now().Format("2006-01-02 15:04:05"), nil
}

func funcYear(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("YEAR requires exactly 1 argument")
	}

	dateStr := fmt.Sprintf("%v", args[0])
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}

	return float64(date.Year()), nil
}

func funcMonth(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("MONTH requires exactly 1 argument")
	}

	dateStr := fmt.Sprintf("%v", args[0])
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}

	return float64(date.Month()), nil
}

func funcDay(args []interface{}) (interface{}, error) {
	if len(args) != 1 {
		return nil, fmt.Errorf("DAY requires exactly 1 argument")
	}

	dateStr := fmt.Sprintf("%v", args[0])
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, err
	}

	return float64(date.Day()), nil
}

func funcDate(args []interface{}) (interface{}, error) {
	if len(args) != 3 {
		return nil, fmt.Errorf("DATE requires exactly 3 arguments")
	}

	year, err := toFloat64(args[0])
	if err != nil {
		return nil, err
	}

	month, err := toFloat64(args[1])
	if err != nil {
		return nil, err
	}

	day, err := toFloat64(args[2])
	if err != nil {
		return nil, err
	}

	date := time.Date(int(year), time.Month(month), int(day), 0, 0, 0, 0, time.UTC)
	return date.Format("2006-01-02"), nil
}

// Lookup Functions (Simplified implementations)

func funcVlookup(args []interface{}) (interface{}, error) {
	return nil, fmt.Errorf("VLOOKUP not yet implemented")
}

func funcHlookup(args []interface{}) (interface{}, error) {
	return nil, fmt.Errorf("HLOOKUP not yet implemented")
}

func funcIndex(args []interface{}) (interface{}, error) {
	return nil, fmt.Errorf("INDEX not yet implemented")
}

func funcMatch(args []interface{}) (interface{}, error) {
	return nil, fmt.Errorf("MATCH not yet implemented")
}
