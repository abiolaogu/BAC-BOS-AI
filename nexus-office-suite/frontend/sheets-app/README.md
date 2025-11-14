# NEXUS Sheets - Web Frontend

Professional spreadsheet editor with formula calculation and data analysis capabilities.

## Features

- **Spreadsheet Grid**: Excel-like grid with cell selection and editing
- **Formula Bar**: Edit formulas and cell values
- **Formula Support**: 50+ built-in functions (SUM, AVERAGE, IF, etc.)
- **Cell Formatting**: Bold, italic, underline, colors, fonts
- **Multiple Sheets**: Tab-based sheet management
- **Keyboard Navigation**: Arrow keys, Enter, F2 for editing
- **Auto-save**: Automatic cell updates
- **Real-time Updates**: Instant formula calculation
- **Responsive**: Works on desktop and tablet

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS
- **Grid Rendering**: Custom virtualized grid
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- NEXUS Sheets backend running on port 8092

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8092/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8092
```

### Development

```bash
npm run dev
# Opens on http://localhost:3001
```

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js pages
│   ├── spreadsheets/[id]/ # Spreadsheet editor
│   ├── login/             # Login page
│   └── page.tsx           # Home page
├── components/
│   ├── spreadsheet/       # Grid, FormulaBar, Toolbar, SheetTabs
│   └── ui/                # Reusable UI components
├── lib/
│   ├── api/               # API clients
│   └── utils.ts           # Utility functions
├── store/                 # Zustand stores
└── types/                 # TypeScript types
```

## Key Components

### SpreadsheetGrid
- Renders cells in a virtualized grid
- Handles cell selection and editing
- Keyboard navigation (arrows, Enter, F2)
- Context menus

### FormulaBar
- Displays current cell reference
- Edit formulas and values
- Submit with Enter

### Toolbar
- Text formatting (bold, italic, underline)
- Fill color
- Insert charts

### SheetTabs
- Multiple sheets per spreadsheet
- Switch between sheets
- Add new sheets

## Keyboard Shortcuts

- **Arrow Keys**: Navigate cells
- **Enter**: Start editing / Move down
- **F2**: Edit cell
- **Escape**: Cancel editing
- **Ctrl+C**: Copy (future)
- **Ctrl+V**: Paste (future)
- **Ctrl+Z**: Undo (future)

## API Integration

The frontend communicates with the NEXUS Sheets backend API:

- `GET /api/v1/spreadsheets/:id` - Load spreadsheet
- `GET /api/v1/sheets/:sheetId/cells` - Load cells
- `PUT /api/v1/sheets/:sheetId/cells/:row/:col` - Update cell
- `POST /api/v1/spreadsheets/:id/sheets` - Add sheet

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Add appropriate error handling
4. Test thoroughly before committing

## License

Copyright (c) 2024 NEXUS Business Operating System
