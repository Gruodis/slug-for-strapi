export interface PluginConfig {
  enabled: boolean;
  sourceField: string;
  fallbackField: string;
  skipGenerationField: string;
  addSuffixForUnique: boolean;
  updateExistingSlugs?: boolean;
  slugifyOptions: {
    lower: boolean;
    strict: boolean;
    locale: string;
    [key: string]: any;
  };
  contentTypes: {
    [key: string]: {
      enabled: boolean;
    };
  };
}

export interface ContentTypeWithSlug {
  uid: string;
  displayName: string;
  hasSlugField: boolean;
  hasTitleField: boolean;
  hasNameField: boolean;
}
