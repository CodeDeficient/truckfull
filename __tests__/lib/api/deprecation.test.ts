/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import { deprecatedEndpointResponse, deprecatedStatusResponse } from '@/lib/api/deprecation';

describe('Deprecation Helpers', () => {
  describe('deprecatedEndpointResponse', () => {
    it('should return 410 status with new endpoint', () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
      });
      expect(response.status).toBe(410);
    });

    it('should include success false in response', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
      });
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('DEPRECATED: This endpoint has been consolidated');
    });

    it('should include migration info with new endpoint', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
      });
      const json = await response.json();
      expect(json.migration).toBeDefined();
      expect(json.migration.newEndpoint).toBe('/api/v2/trucks');
      expect(json.migration.message).toBe('Please use the new endpoint instead');
    });

    it('should include documentation when provided', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        documentation: 'https://docs.example.com/migration',
      });
      const json = await response.json();
      expect(json.migration.documentation).toBe('https://docs.example.com/migration');
    });

    it('should include deprecationDate when provided', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        deprecationDate: '2024-01-01',
      });
      const json = await response.json();
      expect(json.migration.deprecationDate).toBe('2024-01-01');
    });

    it('should include removalDate when provided', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        removalDate: '2025-01-01',
      });
      const json = await response.json();
      expect(json.migration.removalDate).toBe('2025-01-01');
    });

    it('should include mapping when provided', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        mapping: { oldField: 'newField' },
      });
      const json = await response.json();
      expect(json.migration.mapping).toEqual({ oldField: 'newField' });
    });

    it('should not include empty documentation', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        documentation: '',
      });
      const json = await response.json();
      expect(json.migration.documentation).toBeUndefined();
    });

    it('should not include undefined documentation', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        documentation: undefined,
      });
      const json = await response.json();
      expect(json.migration.documentation).toBeUndefined();
    });

    it('should not include empty deprecationDate', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        deprecationDate: '',
      });
      const json = await response.json();
      expect(json.migration.deprecationDate).toBeUndefined();
    });

    it('should not include empty removalDate', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
        removalDate: '',
      });
      const json = await response.json();
      expect(json.migration.removalDate).toBeUndefined();
    });

    it('should not include mapping when undefined', async () => {
      const response = deprecatedEndpointResponse({
        newEndpoint: '/api/v2/trucks',
      });
      const json = await response.json();
      expect(json.migration.mapping).toBeUndefined();
    });
  });

  describe('deprecatedStatusResponse', () => {
    it('should return 410 status', () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
      });
      expect(response.status).toBe(410);
    });

    it('should include DEPRECATED status', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
      });
      const json = await response.json();
      expect(json.status).toBe('DEPRECATED');
      expect(json.message).toBe('This endpoint has been consolidated');
    });

    it('should include migration info with new endpoint', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
      });
      const json = await response.json();
      expect(json.migration).toBeDefined();
      expect(json.migration.newEndpoint).toBe('/api/v2/trucks');
    });

    it('should include documentation when provided', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        documentation: 'https://docs.example.com',
      });
      const json = await response.json();
      expect(json.migration.documentation).toBe('https://docs.example.com');
    });

    it('should include deprecationDate when provided', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        deprecationDate: '2024-01-01',
      });
      const json = await response.json();
      expect(json.migration.deprecationDate).toBe('2024-01-01');
    });

    it('should include removalDate when provided', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        removalDate: '2025-01-01',
      });
      const json = await response.json();
      expect(json.migration.removalDate).toBe('2025-01-01');
    });

    it('should not include empty documentation', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        documentation: '',
      });
      const json = await response.json();
      expect(json.migration.documentation).toBeUndefined();
    });

    it('should not include empty deprecationDate', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        deprecationDate: '',
      });
      const json = await response.json();
      expect(json.migration.deprecationDate).toBeUndefined();
    });

    it('should not include empty removalDate', async () => {
      const response = deprecatedStatusResponse({
        newEndpoint: '/api/v2/trucks',
        removalDate: '',
      });
      const json = await response.json();
      expect(json.migration.removalDate).toBeUndefined();
    });
  });
});