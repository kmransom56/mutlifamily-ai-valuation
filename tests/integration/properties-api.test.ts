import request from 'supertest';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { propertyDatabase } from '@/lib/property-database';

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  default: jest.fn(),
}));

const { getServerSession } = require('next-auth');

describe('/api/properties Integration Tests', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    // Create Next.js app instance for testing
    const nextApp = next({ dev: false, dir: process.cwd() });
    const handle = nextApp.getRequestHandler();
    
    await nextApp.prepare();
    
    server = createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      handle(req, res, parsedUrl);
    });
    
    app = request(server);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Mock authenticated session
    getServerSession.mockResolvedValue({
      user: {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/properties', () => {
    it('should return properties list for authenticated user', async () => {
      const response = await app
        .get('/api/properties')
        .expect(200);

      expect(response.body).toHaveProperty('properties');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('hasMore');
      expect(Array.isArray(response.body.properties)).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const response = await app
        .get('/api/properties?limit=5&offset=10')
        .expect(200);

      expect(response.body).toHaveProperty('properties');
      expect(response.body.properties.length).toBeLessThanOrEqual(5);
    });

    it('should support search filtering', async () => {
      const response = await app
        .get('/api/properties?search=court')
        .expect(200);

      expect(response.body).toHaveProperty('properties');
      // Properties matching search term should be returned
    });

    it('should return 401 for unauthenticated users in production', async () => {
      getServerSession.mockResolvedValue(null);
      
      // Simulate production without mutating read-only NODE_ENV
      const originalFlag = process.env.__FORCE_PROD__;
      process.env.__FORCE_PROD__ = '1';

      await app
        .get('/api/properties')
        .expect(401);

      if (originalFlag) process.env.__FORCE_PROD__ = originalFlag; else delete process.env.__FORCE_PROD__;
    });
  });

  describe('POST /api/properties', () => {
    const validPropertyData = {
      name: 'Test Property',
      type: 'multifamily',
      location: 'Test City, ST',
      units: 50,
      notes: 'Test property for integration testing',
    };

    it('should create a new property with valid data', async () => {
      const response = await app
        .post('/api/properties')
        .send(validPropertyData)
        .expect(201);

      expect(response.body).toHaveProperty('property');
      expect(response.body.property.name).toBe(validPropertyData.name);
      expect(response.body.property.type).toBe(validPropertyData.type);
      expect(response.body.property.location).toBe(validPropertyData.location);
      expect(response.body.property.units).toBe(validPropertyData.units);
      expect(response.body.property).toHaveProperty('id');
      expect(response.body.property).toHaveProperty('dateCreated');
      expect(response.body.property.status).toBe('Pending');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing required fields
        type: 'multifamily',
      };

      await app
        .post('/api/properties')
        .send(invalidData)
        .expect(400);
    });

    it('should validate property type', async () => {
      const invalidData = {
        ...validPropertyData,
        type: 'invalid-type',
      };

      await app
        .post('/api/properties')
        .send(invalidData)
        .expect(400);
    });

    it('should validate units as positive number', async () => {
      const invalidData = {
        ...validPropertyData,
        units: -5,
      };

      await app
        .post('/api/properties')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('GET /api/properties/[id]', () => {
    let testPropertyId: string;

    beforeEach(async () => {
      // Create a test property
      const testProperty = await propertyDatabase.saveProperty({
        name: 'Test Property for GET',
        type: 'multifamily',
        location: 'Test City, ST',
        units: 25,
        userId: 'test-user',
        notes: 'Test property for GET endpoint',
      });
      testPropertyId = testProperty.id;
    });

    it('should return specific property by ID', async () => {
      const response = await app
        .get(`/api/properties/${testPropertyId}`)
        .expect(200);

      expect(response.body).toHaveProperty('property');
      expect(response.body.property.id).toBe(testPropertyId);
      expect(response.body.property.name).toBe('Test Property for GET');
    });

    it('should return 404 for non-existent property', async () => {
      await app
        .get('/api/properties/non-existent-id')
        .expect(404);
    });

    it('should return property with all required fields', async () => {
      const response = await app
        .get(`/api/properties/${testPropertyId}`)
        .expect(200);

      const property = response.body.property;
      expect(property).toHaveProperty('id');
      expect(property).toHaveProperty('name');
      expect(property).toHaveProperty('type');
      expect(property).toHaveProperty('location');
      expect(property).toHaveProperty('units');
      expect(property).toHaveProperty('status');
      expect(property).toHaveProperty('dateCreated');
    });
  });

  describe('PUT /api/properties/[id]', () => {
    let testPropertyId: string;

    beforeEach(async () => {
      const testProperty = await propertyDatabase.saveProperty({
        name: 'Test Property for PUT',
        type: 'multifamily',
        location: 'Test City, ST',
        units: 30,
        userId: 'test-user',
      });
      testPropertyId = testProperty.id;
    });

    it('should update property with valid data', async () => {
      const updateData = {
        name: 'Updated Property Name',
        units: 35,
        status: 'Under Review',
      };

      const response = await app
        .put(`/api/properties/${testPropertyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('property');
      expect(response.body.property.name).toBe(updateData.name);
      expect(response.body.property.units).toBe(updateData.units);
      expect(response.body.property.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent property', async () => {
      await app
        .put('/api/properties/non-existent-id')
        .send({ name: 'Updated Name' })
        .expect(404);
    });

    it('should validate status values', async () => {
      const invalidData = {
        status: 'Invalid Status',
      };

      await app
        .put(`/api/properties/${testPropertyId}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('DELETE /api/properties/[id]', () => {
    let testPropertyId: string;

    beforeEach(async () => {
      const testProperty = await propertyDatabase.saveProperty({
        name: 'Test Property for DELETE',
        type: 'multifamily',
        location: 'Test City, ST',
        units: 20,
        userId: 'test-user',
      });
      testPropertyId = testProperty.id;
    });

    it('should delete existing property', async () => {
      await app
        .delete(`/api/properties/${testPropertyId}`)
        .expect(200);

      // Verify property is deleted
      await app
        .get(`/api/properties/${testPropertyId}`)
        .expect(404);
    });

    it('should return 404 for non-existent property', async () => {
      await app
        .delete('/api/properties/non-existent-id')
        .expect(404);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      await app
        .post('/api/properties')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      jest.spyOn(propertyDatabase, 'searchProperties').mockRejectedValue(new Error('Database error'));

      await app
        .get('/api/properties')
        .expect(500);

      // Restore mock
      jest.restoreAllMocks();
    });
  });

  describe('Security', () => {
    it('should sanitize input data', async () => {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        type: 'multifamily',
        location: 'Test City',
        units: 10,
      };

      const response = await app
        .post('/api/properties')
        .send(maliciousData)
        .expect(201);

      // Should not contain script tags
      expect(response.body.property.name).not.toContain('<script>');
    });

    it('should validate content-type header', async () => {
      await app
        .post('/api/properties')
        .send({ name: 'Test' })
        .set('Content-Type', 'text/plain')
        .expect(400);
    });
  });
});