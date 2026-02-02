import slugGeneratorService from '../slug-generator';

// Mock Strapi global
const mockStrapi = {
  config: {
    get: jest.fn(),
  },
  db: {
    query: jest.fn(() => ({
      findOne: jest.fn(),
    })),
  },
  contentTypes: {},
};

describe('Slug Generator Service', () => {
  let service: ReturnType<typeof slugGeneratorService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    service = slugGeneratorService({ strapi: mockStrapi as any });
  });

  describe('extractTextFromField', () => {
    test('should return string as is if input is string', () => {
      const input = 'Hello World';
      const result = service.extractTextFromField(input);
      expect(result).toBe('Hello World');
    });

    test('should return empty string if input is null', () => {
      const result = service.extractTextFromField(null);
      expect(result).toBe('');
    });

    test('should return empty string if input is undefined', () => {
      const result = service.extractTextFromField(undefined);
      expect(result).toBe('');
    });

    test('should return empty string if input is not a string (e.g. number)', () => {
      const result = service.extractTextFromField(123);
      expect(result).toBe('');
    });
  });

  describe('generateUniqueSlug', () => {
    test('should generate a simple slug', async () => {
      mockStrapi.config.get.mockReturnValue({
        slugifyOptions: { lower: true, strict: true },
      });
      // Mock db to find nothing (slug is unique)
      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const result = await service.generateUniqueSlug(
        'Hello World',
        'api::article.article'
      );
      expect(result).toBe('hello-world');
    });

    test('should increment slug if it already exists', async () => {
      mockStrapi.config.get.mockReturnValue({
        slugifyOptions: { lower: true, strict: true },
      });

      // Mock findOne to return something first time (conflict), then nothing (unique)
      const findOneMock = jest.fn()
        .mockResolvedValueOnce({ id: 1, slug: 'hello-world' }) // 1st call: conflict
        .mockResolvedValueOnce(null); // 2nd call: unique

      (mockStrapi.db.query as jest.Mock).mockReturnValue({
        findOne: findOneMock,
      });

      const result = await service.generateUniqueSlug(
        'Hello World',
        'api::article.article'
      );
      
      expect(result).toBe('hello-world-1');
      expect(findOneMock).toHaveBeenCalledTimes(2);
    });

    test('should return empty string if text is empty', async () => {
      const result = await service.generateUniqueSlug('', 'api::test.test');
      expect(result).toBe('');
    });
  });
});
