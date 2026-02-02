export interface PluginConfig {
  enabled: boolean;
  sourceField: string;
  fallbackField: string;
  skipGenerationField: string;
  addSuffixForUnique: boolean;
  slugifyOptions: {
    lower: boolean;
    strict: boolean;
    locale: string;
  };
  contentTypes: Record<string, { enabled?: boolean }>;
  updateExistingSlugs?: boolean;
}

export interface ConfigModule {
  default: PluginConfig;
  validator: (config: PluginConfig) => void;
}

const config: ConfigModule = {
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
  validator: (config: PluginConfig) => {
    // Configuration validation
    if (typeof config.enabled !== 'boolean') {
      throw new Error('enabled must be a boolean');
    }
    if (typeof config.sourceField !== 'string') {
      throw new Error('sourceField must be a string');
    }
  },
};

export default config;
