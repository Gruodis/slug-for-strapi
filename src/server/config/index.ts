export default {
  default: {
    // Global settings
    enabled: true,
    sourceField: 'title', // Primary field to generate slug from
    fallbackField: 'name', // Fallback field if primary is empty
    skipGenerationField: 'skipSlugGeneration', // Field to check if slug generation should be skipped
    addSuffixForUnique: true, // Add suffixes for uniqueness (-1, -2, -3)
    slugifyOptions: {
      lower: true,
      strict: true,
      locale: 'lt'
    },
    
    // Content-types settings (filled automatically)
    contentTypes: {
      // 'api::article.article': { enabled: true },
      // 'api::page.page': { enabled: true },
    }
  },
  validator: (config: any) => {
    // Configuration validation
    if (typeof config.enabled !== 'boolean') {
      throw new Error('enabled must be a boolean');
    }
    if (typeof config.sourceField !== 'string') {
      throw new Error('sourceField must be a string');
    }
  },
};
