import generalController from '../general';

// Mock Strapi global
const mockFindFirst = jest.fn();
const mockConfigGet = jest.fn();
const mockStrapi = {
  config: {
    get: mockConfigGet,
  },
  contentTypes: {
    'api::article.article': { uid: 'api::article.article', attributes: {} }
  },
  contentType: jest.fn(),
  contentAPI: {
    validate: {
      query: jest.fn(),
    },
    sanitize: {
      query: jest.fn(),
      output: jest.fn(),
    },
  },
  documents: jest.fn(() => ({
    findFirst: mockFindFirst,
  })),
  getModel: jest.fn(),
  log: {
    error: jest.fn(),
  },
};

describe('General Controller', () => {
  let controller: ReturnType<typeof generalController>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = generalController({ strapi: mockStrapi as any });
  });

  describe('findBySlug', () => {
    test('should return 400 if uid or slug is missing', async () => {
      const ctx = {
        params: {},
        query: {},
        badRequest: jest.fn(),
      };

      await controller.findBySlug(ctx as any);
      expect(ctx.badRequest).toHaveBeenCalledWith('Missing uid or slug');
    });

    test('should validate, sanitize query, fetch entity with deep populate, and sanitize output', async () => {
      const uid = 'api::article.article';
      const slug = 'test-slug';
      const ctx = {
        params: { uid, slug },
        query: { someParam: 'value', publicationState: 'preview' },
        state: { auth: { user: 'test-user' } },
        badRequest: jest.fn(),
        notFound: jest.fn(),
      };

      const mockSanitizedQuery = { 
        populate: undefined, // Simulate no populate param passed
        fields: ['title', 'slug'] 
      };
      
      const mockEntity = { id: 1, title: 'Test Article', slug };
      const mockSanitizedEntity = { title: 'Test Article', slug };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue(mockSanitizedQuery);
      mockFindFirst.mockResolvedValue(mockEntity);
      (mockStrapi.contentAPI.sanitize.output as jest.Mock).mockResolvedValue(mockSanitizedEntity);
      // Mock getModel to return a schema that triggers deep populate logic
      (mockStrapi.getModel as jest.Mock).mockImplementation((uid) => {
        if (uid === 'api::article.article') {
          return {
            attributes: {
              someComponent: { type: 'component', component: 'default.comp' },
              title: { type: 'string' }
            }
          };
        }
        if (uid === 'default.comp') {
          return {
            attributes: {
              simpleField: { type: 'string' }
            }
          };
        }
        return {};
      });

      await controller.findBySlug(ctx as any);

      // 1. Check content type retrieval
      expect(mockStrapi.getModel).toHaveBeenCalledWith(uid);

      // 2. Check validation
      expect(mockStrapi.contentAPI.validate.query).toHaveBeenCalledWith(
        { someParam: 'value' }, // publicationState should be removed
        expect.anything(),
        { auth: ctx.state.auth }
      );

      // 3. Check sanitization
      expect(mockStrapi.contentAPI.sanitize.query).toHaveBeenCalledWith(
        { someParam: 'value' },
        expect.anything(),
        { auth: ctx.state.auth }
      );

      // 4. Check findFirst call with deep populate
      expect(mockStrapi.documents).toHaveBeenCalledWith(uid);
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        filters: { slug },
        // We expect deep populate to be generated and passed
        populate: expect.objectContaining({
          someComponent: { populate: '*' } // Mocked deep recursion result for simple component
        }),
        fields: mockSanitizedQuery.fields,
      }));

      // 5. Check output sanitization
      expect(mockStrapi.contentAPI.sanitize.output).toHaveBeenCalledWith(
        mockEntity,
        expect.anything(),
        { auth: ctx.state.auth }
      );

      // 6. Check response
      expect((ctx as any).body).toEqual({ data: mockSanitizedEntity });
    });

    test('should return 404 if entity not found', async () => {
      const uid = 'api::article.article';
      const slug = 'test-slug';
      const ctx = {
        params: { uid, slug },
        query: {},
        state: { auth: {} },
        badRequest: jest.fn(),
        notFound: jest.fn(),
      };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue({});
      mockFindFirst.mockResolvedValue(null);

      await controller.findBySlug(ctx as any);

      expect(ctx.notFound).toHaveBeenCalled();
    });
    test('should respect deep populate from query', async () => {
      const uid = 'api::article.article';
      const slug = 'test-slug';
      const ctx = {
        params: { uid, slug },
        query: { populate: { component: { populate: '*' } } }, // User requests deep populate
        state: { auth: {} },
        badRequest: jest.fn(),
      };

      const mockSanitizedQuery = { 
        populate: { component: { populate: '*' } },
        fields: ['title'] 
      };
      
      const mockEntity = { id: 1, slug };
      const mockSanitizedEntity = { slug };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue(mockSanitizedQuery);
      mockFindFirst.mockResolvedValue(mockEntity);
      (mockStrapi.contentAPI.sanitize.output as jest.Mock).mockResolvedValue(mockSanitizedEntity);

      await controller.findBySlug(ctx as any);

      expect(mockStrapi.contentAPI.sanitize.query).toHaveBeenCalledWith(
        { populate: { component: { populate: '*' } } },
        mockStrapi.getModel(uid),
        { auth: ctx.state.auth }
      );

      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        populate: { component: { populate: '*' } }
      }));
    });

    test('should fallback to * populate if deep populate returns * (no relations/components)', async () => {
      const uid = 'api::simple.simple';
      const slug = 'simple-slug';
      const ctx = {
        params: { uid, slug },
        query: {},
        state: { auth: {} },
        badRequest: jest.fn(),
      };

      const mockSanitizedQuery = { 
        populate: undefined,
        fields: ['title'] 
      };
      
      const mockEntity = { id: 1, slug };
      const mockSanitizedEntity = { slug };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue(mockSanitizedQuery);
      mockFindFirst.mockResolvedValue(mockEntity);
      (mockStrapi.contentAPI.sanitize.output as jest.Mock).mockResolvedValue(mockSanitizedEntity);

      // Mock getModel to return a schema with only scalar attributes
      (mockStrapi.getModel as jest.Mock).mockImplementation((modelUid) => {
        if (modelUid === uid) {
          return {
            attributes: {
              title: { type: 'string' },
              description: { type: 'text' }
            }
          };
        }
        return {};
      });

      await controller.findBySlug(ctx as any);

      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        filters: { slug },
        populate: '*', // Should be converted from * to *
      }));
    });

    test('should use custom depth from config', async () => {
      const uid = 'api::nested.nested';
      const slug = 'nested-slug';
      const ctx = {
        params: { uid, slug },
        query: {},
        state: { auth: {} },
        badRequest: jest.fn(),
      };

      const mockSanitizedQuery = { 
        populate: undefined,
        fields: ['title'] 
      };
      const mockEntity = { id: 1, slug };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue(mockSanitizedQuery);
      mockFindFirst.mockResolvedValue(mockEntity);
      (mockStrapi.contentAPI.sanitize.output as jest.Mock).mockResolvedValue(mockEntity);
      
      // Mock config to return depth 1 for this uid
      mockConfigGet.mockReturnValue({
        populateDepth: {
          [uid]: 1
        }
      });

      // Mock schema: component -> component
      (mockStrapi.getModel as jest.Mock).mockImplementation((modelUid) => {
        if (modelUid === uid) {
          return {
            attributes: {
              comp1: { type: 'component', component: 'default.comp1' }
            }
          };
        }
        if (modelUid === 'default.comp1') {
          return {
            attributes: {
              comp2: { type: 'component', component: 'default.comp2' }
            }
          };
        }
        return {};
      });

      await controller.findBySlug(ctx as any);

      // Expect depth 1: comp1 should be populated with '*', not recursed into comp2
      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        populate: {
          comp1: { populate: '*' }
        }
      }));
    });
  });
});
