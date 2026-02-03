import generalController from '../general';

// Mock Strapi global
const mockFindFirst = jest.fn();
const mockStrapi = {
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

    test('should validate, sanitize query, fetch entity, and sanitize output', async () => {
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
        populate: { someRelation: true },
        fields: ['title', 'slug'] 
      };
      
      const mockEntity = { id: 1, title: 'Test Article', slug };
      const mockSanitizedEntity = { title: 'Test Article', slug };

      (mockStrapi.contentAPI.sanitize.query as jest.Mock).mockResolvedValue(mockSanitizedQuery);
      mockFindFirst.mockResolvedValue(mockEntity);
      (mockStrapi.contentAPI.sanitize.output as jest.Mock).mockResolvedValue(mockSanitizedEntity);

      await controller.findBySlug(ctx as any);

      // 1. Check content type retrieval
      expect(mockStrapi.contentTypes[uid]).toBeDefined();

      // 2. Check validation
      expect(mockStrapi.contentAPI.validate.query).toHaveBeenCalledWith(
        { someParam: 'value' }, // publicationState should be removed
        mockStrapi.contentTypes[uid],
        { auth: ctx.state.auth }
      );

      // 3. Check sanitization
      expect(mockStrapi.contentAPI.sanitize.query).toHaveBeenCalledWith(
        { someParam: 'value' },
        mockStrapi.contentTypes[uid],
        { auth: ctx.state.auth }
      );

      // 4. Check findFirst call with correct params
      expect(mockStrapi.documents).toHaveBeenCalledWith(uid);
      expect(mockFindFirst).toHaveBeenCalledWith({
        filters: { slug },
        status: 'draft', // preview maps to draft first
        populate: mockSanitizedQuery.populate,
        fields: mockSanitizedQuery.fields,
      });

      // 5. Check output sanitization
      expect(mockStrapi.contentAPI.sanitize.output).toHaveBeenCalledWith(
        mockEntity,
        mockStrapi.contentTypes[uid], // Should pass the contentType object, not getModel result
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
  });
});
