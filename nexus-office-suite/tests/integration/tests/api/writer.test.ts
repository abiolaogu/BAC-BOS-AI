import request from 'supertest';

/**
 * Writer API Integration Tests
 * Tests document CRUD operations, sharing, and collaboration features
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

describe('Writer API', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create and login test user
    const response = await request(API_BASE_URL)
      .post('/api/auth/register')
      .send({
        name: 'Writer Test User',
        email: `writer-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('POST /api/writer/documents', () => {
    it('should create a new document', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'My New Document',
          content: 'Document content',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('document');
      expect(response.body.document).toHaveProperty('id');
      expect(response.body.document.title).toBe('My New Document');
      expect(response.body.document.ownerId).toBe(userId);
    });

    it('should create document from template', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'resume-template',
          title: 'My Resume',
        });

      expect(response.status).toBe(201);
      expect(response.body.document).toHaveProperty('content');
      expect(response.body.document.content).toContain('Resume');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .send({
          title: 'Unauthenticated Document',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/writer/documents', () => {
    beforeEach(async () => {
      // Create some documents
      for (let i = 0; i < 3; i++) {
        await request(API_BASE_URL)
          .post('/api/writer/documents')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: `Test Document ${i}`,
            content: `Content ${i}`,
          });
      }
    });

    it('should list user documents', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('documents');
      expect(Array.isArray(response.body.documents)).toBe(true);
      expect(response.body.documents.length).toBeGreaterThanOrEqual(3);
    });

    it('should support pagination', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/documents?limit=2&offset=0')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.documents.length).toBeLessThanOrEqual(2);
      expect(response.body).toHaveProperty('total');
    });

    it('should filter documents by search query', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/documents?search=Test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.documents.every((doc: any) =>
        doc.title.includes('Test') || doc.content.includes('Test')
      )).toBe(true);
    });
  });

  describe('GET /api/writer/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Single Document',
          content: 'Single content',
        });

      documentId = response.body.document.id;
    });

    it('should get document by id', async () => {
      const response = await request(API_BASE_URL)
        .get(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.document.id).toBe(documentId);
      expect(response.body.document.title).toBe('Single Document');
    });

    it('should return 404 for non-existent document', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/documents/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject unauthorized access', async () => {
      // Create another user
      const otherUserResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send({
          name: 'Other User',
          email: `other-${Date.now()}@example.com`,
          password: 'SecurePassword123!',
        });

      const response = await request(API_BASE_URL)
        .get(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/writer/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Update Test',
          content: 'Original content',
        });

      documentId = response.body.document.id;
    });

    it('should update document', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          content: 'Updated content',
        });

      expect(response.status).toBe(200);
      expect(response.body.document.title).toBe('Updated Title');
      expect(response.body.document.content).toBe('Updated content');
    });

    it('should support partial updates', async () => {
      const response = await request(API_BASE_URL)
        .put(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Only Title Updated',
        });

      expect(response.status).toBe(200);
      expect(response.body.document.title).toBe('Only Title Updated');
      expect(response.body.document.content).toBe('Original content');
    });

    it('should create version history', async () => {
      await request(API_BASE_URL)
        .put(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Version 2',
        });

      const versionsResponse = await request(API_BASE_URL)
        .get(`/api/writer/documents/${documentId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(versionsResponse.status).toBe(200);
      expect(versionsResponse.body.versions.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/writer/documents/:id', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Delete Test',
          content: 'To be deleted',
        });

      documentId = response.body.document.id;
    });

    it('should delete document', async () => {
      const response = await request(API_BASE_URL)
        .delete(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Document deleted successfully');

      // Verify document is deleted
      const getResponse = await request(API_BASE_URL)
        .get(`/api/writer/documents/${documentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });

  describe('POST /api/writer/documents/:id/share', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Share Test',
          content: 'Shared content',
        });

      documentId = response.body.document.id;
    });

    it('should share document with user', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'collaborator@example.com',
          permission: 'edit',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Document shared successfully');
    });

    it('should support different permission levels', async () => {
      const permissions = ['view', 'comment', 'edit'];

      for (const permission of permissions) {
        const response = await request(API_BASE_URL)
          .post(`/api/writer/documents/${documentId}/share`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            email: `user-${permission}@example.com`,
            permission,
          });

        expect(response.status).toBe(200);
      }
    });

    it('should create shareable link', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/share-link`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permission: 'view',
          expiresIn: '7d',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shareLink');
      expect(response.body.shareLink).toMatch(/^https?:\/\/.+/);
    });
  });

  describe('POST /api/writer/documents/:id/comments', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Comment Test',
          content: 'Content with comments',
        });

      documentId = response.body.document.id;
    });

    it('should add comment to document', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Great work!',
          position: { start: 0, end: 10 },
        });

      expect(response.status).toBe(201);
      expect(response.body.comment).toHaveProperty('id');
      expect(response.body.comment.text).toBe('Great work!');
    });

    it('should reply to comment', async () => {
      // Create original comment
      const commentResponse = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Original comment',
          position: { start: 0, end: 10 },
        });

      const commentId = commentResponse.body.comment.id;

      // Reply to comment
      const replyResponse = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/comments/${commentId}/replies`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Reply to comment',
        });

      expect(replyResponse.status).toBe(201);
      expect(replyResponse.body.reply.text).toBe('Reply to comment');
    });

    it('should resolve comment', async () => {
      const commentResponse = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'To be resolved',
          position: { start: 0, end: 10 },
        });

      const commentId = commentResponse.body.comment.id;

      const resolveResponse = await request(API_BASE_URL)
        .put(`/api/writer/documents/${documentId}/comments/${commentId}/resolve`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(resolveResponse.status).toBe(200);
      expect(resolveResponse.body.comment.resolved).toBe(true);
    });
  });

  describe('GET /api/writer/templates', () => {
    it('should list available templates', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
    });

    it('should filter templates by category', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/writer/templates?category=business')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.templates.every((t: any) =>
        t.category === 'business'
      )).toBe(true);
    });
  });

  describe('POST /api/writer/documents/:id/export', () => {
    let documentId: string;

    beforeEach(async () => {
      const response = await request(API_BASE_URL)
        .post('/api/writer/documents')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Export Test',
          content: 'Content to export',
        });

      documentId = response.body.document.id;
    });

    it('should export document as PDF', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'pdf',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });

    it('should export document as DOCX', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'docx',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('officedocument');
    });

    it('should export document as Markdown', async () => {
      const response = await request(API_BASE_URL)
        .post(`/api/writer/documents/${documentId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          format: 'md',
        });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('text/markdown');
    });
  });
});
