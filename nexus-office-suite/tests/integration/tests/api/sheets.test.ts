import request from 'supertest';

/**
 * Sheets API Integration Tests
 * Tests spreadsheet CRUD operations, cell operations, and formulas
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

describe('Sheets API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const response = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        name: 'Sheets Test User',
        email: `sheets-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('POST /api/sheets/spreadsheets', () => {
    it('should create a new spreadsheet', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'My Spreadsheet',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('spreadsheet');
      expect(response.body.spreadsheet).toHaveProperty('id');
      expect(response.body.spreadsheet.title).toBe('My Spreadsheet');
      expect(response.body.spreadsheet).toHaveProperty('sheets');
      expect(response.body.spreadsheet.sheets.length).toBe(1);
    });

    it('should create spreadsheet from template', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'budget-template',
          title: 'My Budget',
        });

      expect(response.status).toBe(201);
      expect(response.body.spreadsheet.sheets[0]).toHaveProperty('cells');
    });
  });

  describe('PUT /api/sheets/spreadsheets/:id/cells', () => {
    let spreadsheetId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Cell Test',
        });

      spreadsheetId = response.body.spreadsheet.id;
    });

    it('should update cell value', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          cell: 'A1',
          value: 'Hello',
        });

      expect(response.status).toBe(200);
      expect(response.body.cell.value).toBe('Hello');
    });

    it('should evaluate formulas', async () => {
      // Set values
      await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          cell: 'A1',
          value: 10,
        });

      await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          cell: 'A2',
          value: 20,
        });

      // Set formula
      const response = await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/cells`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          cell: 'A3',
          value: '=SUM(A1:A2)',
        });

      expect(response.status).toBe(200);
      expect(response.body.cell.computedValue).toBe(30);
    });

    it('should support range updates', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/cells/batch`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          updates: [
            { cell: 'A1', value: 1 },
            { cell: 'A2', value: 2 },
            { cell: 'A3', value: 3 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.updatedCells.length).toBe(3);
    });
  });

  describe('POST /api/sheets/spreadsheets/:id/sheets', () => {
    let spreadsheetId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Sheet Test',
        });

      spreadsheetId = response.body.spreadsheet.id;
    });

    it('should add new sheet', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/sheets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Sheet 2',
        });

      expect(response.status).toBe(201);
      expect(response.body.sheet).toHaveProperty('id');
      expect(response.body.sheet.title).toBe('Sheet 2');
    });

    it('should rename sheet', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/sheets/spreadsheets/${spreadsheetId}/sheets/0`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Renamed Sheet',
        });

      expect(response.status).toBe(200);
      expect(response.body.sheet.title).toBe('Renamed Sheet');
    });

    it('should delete sheet', async () => {
      // Add another sheet
      await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/sheets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'To Delete',
        });

      const response = await request(API_BASE_URL)
        .delete(`/api/sheets/spreadsheets/${spreadsheetId}/sheets/1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/sheets/spreadsheets/:id/rows', () => {
    let spreadsheetId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Row Test',
        });

      spreadsheetId = response.body.spreadsheet.id;
    });

    it('should insert row', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/rows`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
          beforeRow: 1,
        });

      expect(response.status).toBe(200);
    });

    it('should delete row', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/sheets/spreadsheets/${spreadsheetId}/rows/1`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sheetId: 0,
        });

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/sheets/spreadsheets/:id/export', () => {
    let spreadsheetId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Export Test',
        });

      spreadsheetId = response.body.spreadsheet.id;
    });

    it('should export as CSV', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'csv',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/csv');
    });

    it('should export as XLSX', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'xlsx',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml');
    });
  });

  describe('POST /api/sheets/spreadsheets/:id/import', () => {
    let spreadsheetId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/sheets/spreadsheets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Import Test',
        });

      spreadsheetId = response.body.spreadsheet.id;
    });

    it('should import CSV data', async () => {
      const csvData = 'Name,Age\nAlice,25\nBob,30';

      const response = await request(API_BASE_URL)
        .post(`/api/sheets/spreadsheets/${spreadsheetId}/import`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from(csvData), 'data.csv');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Data imported successfully');
    });
  });
});
