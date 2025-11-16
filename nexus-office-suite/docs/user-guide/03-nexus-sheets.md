# NEXUS Sheets User Guide

**Version**: 1.0
**Last Updated**: November 2025
**Audience**: End Users

---

## Table of Contents

1. [Introduction](#introduction)
2. [Creating Spreadsheets](#creating-spreadsheets)
3. [Working with Cells](#working-with-cells)
4. [Formulas and Functions](#formulas-and-functions)
5. [Charts and Graphs](#charts-and-graphs)
6. [Data Filtering and Sorting](#data-filtering-and-sorting)
7. [Collaboration](#collaboration)
8. [Importing and Exporting](#importing-and-exporting)
9. [Advanced Features](#advanced-features)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Introduction

NEXUS Sheets is a powerful spreadsheet application that helps you organize, analyze, and visualize data. Whether you're managing budgets, tracking projects, or performing complex calculations, Sheets provides all the tools you need.

### Key Features

- 📊 **Powerful Formulas**: 400+ built-in functions
- 📈 **Charts & Graphs**: Visualize your data
- 🔄 **Real-Time Collaboration**: Work together simultaneously
- 📱 **Mobile Support**: Edit on any device
- 🔍 **Data Analysis**: Pivot tables, filtering, sorting
- 📥 **Import/Export**: Excel, CSV, and more
- 🤖 **Smart Fill**: AI-powered data completion

---

## Creating Spreadsheets

### Create a New Spreadsheet

#### From NEXUS Hub
1. Click **"New Spreadsheet"** button
2. Or click the Sheets app icon → **"Create New"**

#### From NEXUS Sheets
1. Click **File** → **New Spreadsheet**
2. Or press `Ctrl+N`

#### From a Template
1. Click **File** → **New from Template**
2. Choose from templates:
   - Budget Planner
   - Project Timeline
   - Expense Tracker
   - Invoice
   - Grade Book
   - Inventory Management
3. Click **"Use Template"**

### Spreadsheet Structure

```
    A          B          C          D
1  [Cell A1]  [Cell B1]  [Cell C1]  [Cell D1]
2  [Cell A2]  [Cell B2]  [Cell C2]  [Cell D2]
3  [Cell A3]  [Cell B3]  [Cell C3]  [Cell D3]
```

- **Columns**: Lettered A, B, C, ... Z, AA, AB...
- **Rows**: Numbered 1, 2, 3, ...
- **Cells**: Intersection of column and row (e.g., A1, B5)
- **Sheets/Tabs**: Multiple sheets in one spreadsheet

### Working with Sheets

#### Add a Sheet
- Click the **"+"** button at the bottom
- Or right-click sheet tab → **Insert sheet**

#### Rename a Sheet
- Double-click the sheet tab
- Type new name
- Press Enter

#### Delete a Sheet
- Right-click sheet tab
- Select **"Delete"**
- Confirm deletion

#### Move/Copy Sheets
- Drag sheet tab to reorder
- Right-click → **"Copy to"** → Select spreadsheet
- Or **"Move to"** to move instead of copy

#### Hide/Show Sheets
- Right-click sheet tab → **"Hide sheet"**
- Right-click any tab → **"Unhide sheet"** → Select sheet

---

## Working with Cells

### Selecting Cells

#### Single Cell
- Click the cell

#### Range of Cells
- Click and drag from start to end
- Or click first cell, hold Shift, click last cell

#### Entire Row/Column
- Click row number or column letter

#### Multiple Ranges
- Select first range
- Hold Ctrl (Windows) or Cmd (Mac)
- Select additional ranges

#### All Cells
- Press `Ctrl+A` or click the box above row 1 and left of column A

### Entering Data

#### Text and Numbers
1. Click a cell
2. Type your data
3. Press Enter to move down or Tab to move right

#### Dates and Times
- Type in format: `1/15/2025` or `Jan 15, 2025`
- Or `2:30 PM` or `14:30`
- Sheets auto-detects and formats

#### Copy and Paste
- **Copy**: Select cell(s), press `Ctrl+C`
- **Cut**: Select cell(s), press `Ctrl+X`
- **Paste**: Select destination, press `Ctrl+V`

#### Auto-Fill
1. Enter data in first cell (e.g., "January")
2. Hover over bottom-right corner (fill handle)
3. Drag down or across
4. Sheets auto-completes the pattern (February, March, ...)

**Patterns that auto-fill**:
- Days of week: Monday, Tuesday, ...
- Months: January, February, ...
- Numbers: 1, 2, 3, ... or 10, 20, 30, ...
- Dates: 1/1/2025, 1/2/2025, ...
- Custom lists

### Formatting Cells

#### Number Formats
1. Select cells
2. Click **Format** → **Number**
3. Choose format:
   - **Number**: 1,000.00
   - **Currency**: $1,000.00
   - **Percentage**: 10.5%
   - **Date**: 1/15/2025
   - **Time**: 2:30 PM
   - **Custom**: Create your own

#### Text Formatting
- **Bold**: `Ctrl+B`
- **Italic**: `Ctrl+I`
- **Underline**: `Ctrl+U`
- **Font**: Select from dropdown
- **Size**: Choose font size
- **Color**: Click text color button

#### Cell Alignment
- **Horizontal**: Left, Center, Right
- **Vertical**: Top, Middle, Bottom
- **Wrap text**: Text wraps within cell
- **Merge cells**: Combine multiple cells

#### Borders and Colors
1. Select cells
2. Click **Border** button for cell borders
3. Click **Fill color** for background
4. Choose color from palette

#### Conditional Formatting

Automatically format cells based on values:

1. Select cells
2. Click **Format** → **Conditional Formatting**
3. Choose rule type:
   - **Greater than**: Highlight if value > number
   - **Less than**: Highlight if value < number
   - **Between**: Highlight if value in range
   - **Equal to**: Highlight if value matches
   - **Text contains**: Highlight if text found
   - **Date is**: Highlight dates
   - **Custom formula**: Advanced conditions
4. Set formatting (color, bold, etc.)
5. Click **"Done"**

**Example**: Highlight sales > $10,000 in green
- Range: B2:B100
- Rule: Greater than 10000
- Format: Green background

---

## Formulas and Functions

### Formula Basics

#### Creating a Formula
1. Click a cell
2. Type `=` to start a formula
3. Type your formula
4. Press Enter

**Example**: `=A1+B1` adds values in A1 and B1

#### Cell References
- **Relative**: `A1` (changes when copied)
- **Absolute**: `$A$1` (stays fixed when copied)
- **Mixed**: `$A1` or `A$1` (partially fixed)

#### Operators
- **Addition**: `+` (e.g., `=A1+B1`)
- **Subtraction**: `-` (e.g., `=A1-B1`)
- **Multiplication**: `*` (e.g., `=A1*B1`)
- **Division**: `/` (e.g., `=A1/B1`)
- **Exponent**: `^` (e.g., `=A1^2`)

### Common Functions

#### SUM - Add Numbers
```
=SUM(A1:A10)          // Sum range A1 to A10
=SUM(A1,B1,C1)        // Sum individual cells
=SUM(A1:A10,B1:B10)   // Sum multiple ranges
```

#### AVERAGE - Calculate Average
```
=AVERAGE(A1:A10)      // Average of A1 to A10
=AVERAGE(A1:A5,C1:C5) // Average multiple ranges
```

#### COUNT - Count Numbers
```
=COUNT(A1:A10)        // Count cells with numbers
=COUNTA(A1:A10)       // Count non-empty cells
=COUNTBLANK(A1:A10)   // Count empty cells
```

#### MIN/MAX - Find Minimum/Maximum
```
=MIN(A1:A10)          // Find smallest value
=MAX(A1:A10)          // Find largest value
```

#### IF - Conditional Logic
```
=IF(A1>100,"High","Low")    // If A1>100, show "High", else "Low"
=IF(A1="","Empty","Filled") // Check if empty
```

#### VLOOKUP - Vertical Lookup
```
=VLOOKUP(A1,B1:D10,3,FALSE)
// Look for A1 in first column of B1:D10
// Return value from 3rd column
// FALSE = exact match
```

#### COUNTIF - Count with Condition
```
=COUNTIF(A1:A10,">100")     // Count cells > 100
=COUNTIF(A1:A10,"Apple")    // Count cells = "Apple"
```

#### SUMIF - Sum with Condition
```
=SUMIF(A1:A10,">100")       // Sum cells > 100
=SUMIF(A1:A10,"Apple",B1:B10) // Sum B1:B10 where A1:A10="Apple"
```

#### TEXT Functions
```
=CONCATENATE(A1," ",B1)     // Join text (or use &)
=UPPER(A1)                  // Convert to UPPERCASE
=LOWER(A1)                  // Convert to lowercase
=PROPER(A1)                 // Convert to Title Case
=LEN(A1)                    // Length of text
=LEFT(A1,3)                 // First 3 characters
=RIGHT(A1,3)                // Last 3 characters
=MID(A1,2,3)                // 3 characters starting at position 2
```

#### DATE Functions
```
=TODAY()                    // Current date
=NOW()                      // Current date and time
=DATE(2025,1,15)           // Create date: Jan 15, 2025
=YEAR(A1)                   // Extract year
=MONTH(A1)                  // Extract month
=DAY(A1)                    // Extract day
=DATEDIF(A1,B1,"D")        // Days between dates
```

#### MATH Functions
```
=ROUND(A1,2)               // Round to 2 decimal places
=ROUNDUP(A1,0)             // Round up to integer
=ROUNDDOWN(A1,0)           // Round down to integer
=ABS(A1)                   // Absolute value
=SQRT(A1)                  // Square root
=POWER(A1,2)               // A1 squared
=RAND()                    // Random number 0-1
=RANDBETWEEN(1,100)        // Random integer 1-100
```

### Formula Tips

1. **Use cell references** instead of hardcoding values
   - Good: `=A1*0.08`
   - Better: `=A1*B1` (put 0.08 in B1)

2. **Name ranges** for readability
   - Select A1:A10
   - Click in name box (left of formula bar)
   - Type "Sales"
   - Use in formula: `=SUM(Sales)`

3. **Array formulas** for advanced calculations
   - Enter formula
   - Press `Ctrl+Shift+Enter` instead of Enter
   - Shown with curly braces: `{=formula}`

4. **Formula auditing**
   - Click **Formulas** → **Show Formulas** to see all formulas
   - Click cell → **Trace Precedents** to see inputs
   - Click cell → **Trace Dependents** to see outputs

---

## Charts and Graphs

### Creating a Chart

1. **Select your data** including headers
2. Click **Insert** → **Chart**
3. Charts panel opens on the right
4. Chart preview appears in spreadsheet

### Chart Types

#### Column Chart
- Compare values across categories
- Good for: Sales by month, product comparisons
- Vertical bars

#### Bar Chart
- Like column chart but horizontal
- Good for: Ranking items, long category names
- Horizontal bars

#### Line Chart
- Show trends over time
- Good for: Stock prices, website traffic
- Connected points

#### Pie Chart
- Show parts of a whole (percentages)
- Good for: Market share, budget breakdown
- Circular slices

#### Area Chart
- Like line chart with filled area
- Good for: Cumulative totals, stacked data
- Filled areas

#### Scatter Chart
- Show relationship between two variables
- Good for: Correlation analysis, scientific data
- Individual points

#### Combo Chart
- Combine multiple chart types
- Good for: Two different scales (e.g., revenue + profit margin)
- Mixed bars and lines

### Customizing Charts

#### Chart Editor Panel

**Setup Tab**:
- **Chart type**: Change chart style
- **Data range**: Modify data source
- **X-axis**: Select category data
- **Series**: Add/remove data series

**Customize Tab**:
- **Chart title**: Add/edit title
- **Chart subtitle**: Add subtitle
- **Legend**: Position, font, color
- **Axes**: Labels, min/max, gridlines
- **Series**: Colors, line styles
- **Background**: Color, borders

#### Chart Title
1. Click chart
2. Click **Chart editor** (top-right of chart)
3. Go to **Customize** → **Chart & axis titles**
4. Edit **Title text**
5. Choose font, size, color

#### Legend
1. In Chart editor → **Customize** → **Legend**
2. **Position**: Right, top, bottom, left, none
3. **Font**: Style and size
4. **Color**: Text color

#### Colors and Styles
1. Chart editor → **Customize** → **Series**
2. Select a series
3. Change:
   - **Color**: Fill color
   - **Line thickness**: For line charts
   - **Point size**: For scatter charts
   - **Format**: Solid, dashed, dotted

### Moving and Resizing Charts

- **Move**: Click and drag chart
- **Resize**: Drag corner handles
- **Delete**: Click chart → press Delete key

### Publishing Charts

1. Click chart → **⋮** menu → **Publish chart**
2. Choose:
   - **Link**: Get shareable URL
   - **Embed**: Get HTML code for websites
3. Set update frequency (on change, hourly, daily)

---

## Data Filtering and Sorting

### Sorting Data

#### Sort a Single Column
1. Click any cell in the column
2. Click **Data** → **Sort sheet A→Z** (ascending)
3. Or **Sort sheet Z→A** (descending)

#### Sort Multiple Columns
1. Select data range (including headers)
2. Click **Data** → **Sort range**
3. Check **Data has header row**
4. Choose **Sort by** column
5. Add additional sort columns
6. Click **"Sort"**

**Example**: Sort by Last Name, then First Name
- Sort by: Column B (Last Name) A→Z
- Then by: Column A (First Name) A→Z

### Filtering Data

#### Create a Filter
1. Select data range with headers
2. Click **Data** → **Create a filter**
3. Filter icons appear in header row

#### Use Filter
1. Click filter icon in column header
2. Options:
   - **Filter by condition**: Greater than, less than, contains, etc.
   - **Filter by values**: Check/uncheck specific values
   - **Search**: Find specific items
3. Click **"OK"**
4. Filtered rows shown; others hidden

#### Clear Filter
- Click filter icon → **Clear**
- Or **Data** → **Remove filter**

#### Filter Views

Save and share different filter configurations:

1. Click **Data** → **Filter views** → **Create new filter view**
2. Apply filters
3. Name the filter view
4. Share link to this view
5. Switch between filter views in dropdown

### Unique Values

Remove duplicates or find unique values:

1. Select data range
2. Click **Data** → **Remove duplicates**
3. Choose columns to check
4. Click **"Remove duplicates"**
5. See count of duplicates removed

---

## Collaboration

### Real-Time Collaboration

Multiple users can edit simultaneously:
- See colored cursors with user names
- Changes appear instantly
- Active users shown in top-right

### Comments

#### Add a Comment
1. Right-click cell
2. Select **"Insert comment"**
3. Type comment
4. Click **"Comment"** to post

#### Reply to Comments
- Click comment
- Type in reply box
- Click **"Reply"**

#### Resolve Comments
- Click **"Resolve"** when addressed
- Resolved comments hidden but recoverable

### Protect Sheets and Ranges

Prevent accidental edits:

#### Protect a Sheet
1. Right-click sheet tab
2. Select **"Protect sheet"**
3. Choose:
   - **Except certain cells**: Allow editing specific ranges
   - **Show a warning**: Warn before editing
   - **Restrict who can edit**: Specific users only
4. Click **"Set permissions"**

#### Protect a Range
1. Select range
2. Click **Data** → **Protect sheets and ranges**
3. Click **"Add a sheet or range"**
4. Name the range
5. Set permissions
6. Click **"Done"**

---

## Importing and Exporting

### Import Data

#### From File
1. Click **File** → **Import**
2. Choose source:
   - **Upload**: From your computer
   - **Drive**: From NEXUS Drive
   - **URL**: From web address
3. Select file (Excel, CSV, TSV, ODS)
4. Choose import location:
   - **Create new spreadsheet**
   - **Insert new sheet(s)**
   - **Replace spreadsheet**
   - **Append to current sheet**
   - **Replace current sheet**
5. Click **"Import data"**

#### From CSV/TSV
- Automatically detects delimiter (comma, tab)
- Option to convert text to numbers/dates
- Choose encoding (UTF-8 recommended)

### Export Data

#### Download Formats
1. Click **File** → **Download**
2. Choose format:
   - **Microsoft Excel (.xlsx)**: Full compatibility
   - **OpenDocument (.ods)**: Open standard
   - **PDF (.pdf)**: For sharing/printing
   - **CSV (.csv)**: Comma-separated values
   - **TSV (.tsv)**: Tab-separated values
   - **HTML (.html)**: Web page
   - **Zip**: All sheets as separate files

#### Export to Google Sheets
1. Click **File** → **Share** → **Publish to web**
2. Choose sheet(s)
3. Select format (Web page, CSV, etc.)
4. Click **"Publish"**
5. Copy link to share

---

## Advanced Features

### Pivot Tables

Summarize and analyze large datasets:

1. Select data range
2. Click **Data** → **Pivot table**
3. Choose where to create (new sheet or existing)
4. Pivot table editor opens

**Configure Pivot Table**:
- **Rows**: Group by category (e.g., Product)
- **Columns**: Additional grouping (e.g., Month)
- **Values**: Summarize data (e.g., SUM of Sales)
- **Filters**: Limit data shown

**Example**: Sales by Product by Month
- Rows: Product
- Columns: Month
- Values: SUM of Sales Amount
- Filters: Region = "West"

### Data Validation

Restrict what can be entered in cells:

1. Select cells
2. Click **Data** → **Data validation**
3. Choose criteria:
   - **List from a range**: Dropdown from cells
   - **List of items**: Type items separated by commas
   - **Number**: Between, greater than, etc.
   - **Text**: Contains, email, URL
   - **Date**: Specific date or range
   - **Custom formula**: Advanced validation
4. Choose appearance:
   - **Show dropdown**: List selection
   - **Show validation help text**: Help tooltip
5. On invalid data:
   - **Show warning**: Allow with warning
   - **Reject input**: Prevent entry
6. Click **"Save"**

**Example**: Dropdown list of departments
- Criteria: List of items
- Items: "Sales, Marketing, Engineering, HR"
- Show dropdown: Yes

### Named Ranges

Give ranges meaningful names:

1. Select range
2. Click **Data** → **Named ranges**
3. Click **"Add a range"**
4. Enter name (e.g., "TotalSales")
5. Use in formulas: `=SUM(TotalSales)`

**Benefits**:
- Formulas easier to read
- Less error-prone
- Easy to update ranges

### Query Function

SQL-like data querying:

```
=QUERY(A1:D100, "SELECT A, B WHERE C > 1000 ORDER BY D DESC")
```

**Syntax**:
- **SELECT**: Choose columns (A, B, C or *, or SUM(C), AVG(C))
- **WHERE**: Filter rows (C > 1000, B = 'Active')
- **GROUP BY**: Group results (GROUP BY A)
- **ORDER BY**: Sort results (ORDER BY D DESC)
- **LIMIT**: Limit rows (LIMIT 10)

**Example**: Top 10 sales
```
=QUERY(A1:C100, "SELECT A, B, C WHERE C > 0 ORDER BY C DESC LIMIT 10", 1)
```

### ArrayFormula

Apply formula to entire range:

```
=ARRAYFORMULA(A2:A100*B2:B100)
```

Instead of copying formula down, ArrayFormula applies it to all rows.

**Example**: Calculate tax for all rows
```
=ARRAYFORMULA(IF(A2:A<>"", A2:A*0.08, ""))
```

---

## Keyboard Shortcuts

### Navigation

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Move to next cell | Tab | Tab |
| Move to previous cell | Shift+Tab | Shift+Tab |
| Move down | Enter | Enter |
| Move up | Shift+Enter | Shift+Enter |
| Move to edge of region | Ctrl+Arrow | Cmd+Arrow |
| Go to cell | Ctrl+G | Cmd+G |

### Selection

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Select all | Ctrl+A | Cmd+A |
| Select row | Shift+Space | Shift+Space |
| Select column | Ctrl+Space | Cmd+Space |
| Extend selection | Shift+Arrow | Shift+Arrow |

### Editing

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Edit cell | F2 | F2 |
| Copy | Ctrl+C | Cmd+C |
| Cut | Ctrl+X | Cmd+X |
| Paste | Ctrl+V | Cmd+V |
| Paste values only | Ctrl+Shift+V | Cmd+Shift+V |
| Undo | Ctrl+Z | Cmd+Z |
| Redo | Ctrl+Y | Cmd+Y |
| Fill down | Ctrl+D | Cmd+D |
| Fill right | Ctrl+R | Cmd+R |

### Formatting

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Bold | Ctrl+B | Cmd+B |
| Italic | Ctrl+I | Cmd+I |
| Underline | Ctrl+U | Cmd+U |
| Format as currency | Ctrl+Shift+4 | Cmd+Shift+4 |
| Format as percentage | Ctrl+Shift+5 | Cmd+Shift+5 |
| Format as date | Ctrl+Shift+3 | Cmd+Shift+3 |

### Formulas

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Insert SUM function | Alt+= | Opt+= |
| Show formulas | Ctrl+` | Cmd+` |
| Insert current date | Ctrl+; | Cmd+; |
| Insert current time | Ctrl+Shift+; | Cmd+Shift+; |

---

## Tips and Best Practices

### 1. Organize Data Properly
- First row for headers
- One type of data per column
- No blank rows or columns in data range
- Consistent formatting

### 2. Use Formulas, Not Values
- Calculate instead of typing
- Reference cells instead of hardcoding
- Use named ranges for clarity

### 3. Document Your Work
- Add comments to complex formulas
- Use descriptive sheet names
- Include a "README" sheet with instructions

### 4. Protect Important Data
- Protect sheets from accidental edits
- Use data validation to prevent errors
- Hide sensitive sheets

### 5. Optimize Performance
- Avoid excessive formatting
- Use closed ranges (A1:A100 instead of A:A)
- Minimize volatile functions (NOW, RAND)
- Break large spreadsheets into multiple files

---

## Troubleshooting

### Formula shows #REF! error
- Cell reference is invalid (deleted row/column)
- Check formula references
- Use Undo if you just deleted cells

### Formula shows #DIV/0! error
- Dividing by zero or empty cell
- Add IF statement: `=IF(B1=0,"",A1/B1)`

### Formula shows #VALUE! error
- Wrong data type (text instead of number)
- Check cell values
- Use VALUE() to convert text to number

### Formula shows #N/A error
- VLOOKUP/MATCH couldn't find value
- Check lookup value exists
- Use IFERROR: `=IFERROR(VLOOKUP(...),"Not Found")`

### Chart not updating
- Click chart → **⋮** → **Edit chart**
- Check data range includes new data
- Refresh the page

### Slow performance
- Too many formulas or formatting
- Use Google Sheets Add-ons for complex tasks
- Break into multiple spreadsheets
- Remove unused sheets

---

**Need more help?** Check out:
- [NEXUS Slides Guide →](04-nexus-slides.md)
- [Troubleshooting Guide](../troubleshooting.md)
- Contact support: support@nexusplatform.io

---

**Previous**: [NEXUS Writer](02-nexus-writer.md) | **Next**: [NEXUS Slides →](04-nexus-slides.md)
