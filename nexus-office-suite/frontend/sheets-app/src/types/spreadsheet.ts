export interface Spreadsheet {
  id: string;
  tenantId: string;
  title: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  folderId?: string;
  isDeleted: boolean;
  sheets: Sheet[];
}

export interface Sheet {
  id: string;
  spreadsheetId: string;
  name: string;
  position: number;
  rowCount: number;
  columnCount: number;
  frozenRows?: number;
  frozenColumns?: number;
  hiddenRows?: number[];
  hiddenColumns?: number[];
  createdAt: string;
  updatedAt: string;
}

export type CellDataType = 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'error';

export interface CellValue {
  string?: string;
  number?: number;
  boolean?: boolean;
  date?: string;
}

export interface Cell {
  id: string;
  sheetId: string;
  rowIndex: number;
  columnIndex: number;
  value?: CellValue;
  formula?: string;
  dataType: CellDataType;
  formattedValue?: string;
  style?: CellStyle;
  updatedAt: string;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  horizontalAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  numberFormat?: string;
  borders?: CellBorders;
}

export interface CellBorders {
  top?: BorderStyle;
  right?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
}

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted';
  color: string;
}

export interface Chart {
  id: string;
  sheetId: string;
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'column';
  title?: string;
  dataRange: string;
  config?: ChartConfig;
  position?: ChartPosition;
  createdAt: string;
  updatedAt: string;
}

export interface ChartConfig {
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  legend?: LegendConfig;
}

export interface AxisConfig {
  title?: string;
  range?: string;
}

export interface SeriesConfig {
  name: string;
  range: string;
  color?: string;
}

export interface LegendConfig {
  position: 'top' | 'bottom' | 'left' | 'right' | 'none';
}

export interface ChartPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Request/Response Types
export interface CreateSpreadsheetRequest {
  title: string;
  sheets?: CreateSheetRequest[];
  folderId?: string;
}

export interface CreateSheetRequest {
  name: string;
  rowCount?: number;
  columnCount?: number;
}

export interface UpdateSpreadsheetRequest {
  title?: string;
}

export interface UpdateSheetRequest {
  name?: string;
  frozenRows?: number;
  frozenColumns?: number;
  hiddenRows?: number[];
  hiddenColumns?: number[];
}

export interface UpdateCellRequest {
  value?: any;
  formula?: string;
  style?: CellStyle;
}

export interface BatchUpdateCellsRequest {
  updates: CellUpdate[];
}

export interface CellUpdate {
  rowIndex: number;
  columnIndex: number;
  value?: any;
  formula?: string;
  style?: CellStyle;
}

export interface GetCellsQuery {
  startRow: number;
  endRow: number;
  startColumn: number;
  endColumn: number;
}

export interface ListSpreadsheetsQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  folderId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ListSpreadsheetsResponse {
  spreadsheets: Spreadsheet[];
  total: number;
  page: number;
  pageSize: number;
}

// UI State Types
export interface CellSelection {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface CellPosition {
  row: number;
  col: number;
}

export const COLUMN_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function columnIndexToLetter(index: number): string {
  let result = '';
  let num = index;

  while (num >= 0) {
    result = COLUMN_LETTERS[num % 26] + result;
    num = Math.floor(num / 26) - 1;
  }

  return result;
}

export function letterToColumnIndex(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return result - 1;
}

export function cellPositionToRef(row: number, col: number): string {
  return `${columnIndexToLetter(col)}${row + 1}`;
}

export function cellRefToPosition(ref: string): CellPosition {
  const match = ref.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${ref}`);
  }

  const col = letterToColumnIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;

  return { row, col };
}
