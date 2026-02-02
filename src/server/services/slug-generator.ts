import slugify from 'slugify';

export interface Strapi {
  config: {
    get: (path: string) => any;
  };
  db: {
    query: (uid: string) => {
      findOne: (params: { where: Record<string, any> }) => Promise<any>;
    };
  };
  contentTypes: Record<string, any>;
}

export interface SlugGeneratorService {
  extractTextFromField(fieldValue: any): string;
  generateUniqueSlug(
    text: string,
    contentType: string,
    excludeId?: number | string | null,
    options?: Record<string, any>
  ): Promise<string>;
  generateSlugForEntry(
    data: Record<string, any>,
    contentType: string,
    currentEntity?: Record<string, any> | null
  ): Promise<string | null>;
  getContentTypesWithSlug(): Array<{
    uid: string;
    displayName: string;
    hasSlugField: boolean;
    hasTitleField: boolean;
    hasNameField: boolean;
  }>;
}

export default ({ strapi }: { strapi: Strapi }): SlugGeneratorService => ({
  /**
   * Extracts text from field (string)
   * @param fieldValue - field value
   * @returns text for slug generation
   */
  extractTextFromField(fieldValue: any): string {
    if (!fieldValue) return '';

    // If it's a regular string
    if (typeof fieldValue === 'string') {
      console.log('🔍 [Slug For Strapi] Regular string detected');
      return fieldValue;
    }

    console.log('⚠️ [Slug For Strapi] Unsupported field type (not a string):', typeof fieldValue, fieldValue);
    return '';
  },

  /**
   * Generates unique slug
   * @param text - source text
   * @param contentType - content type
   * @param excludeId - ID to exclude from check (for updates)
   * @param options - slugify options
   * @returns unique slug
   */
  async generateUniqueSlug(
    text: string,
    contentType: string,
    excludeId: number | string | null = null,
    options: Record<string, any> = {}
  ): Promise<string> {
    if (!text) {
      console.log('⚠️ [Slug For Strapi] Empty text for slug generation');
      return '';
    }

    // Get settings from Strapi config
    const config = strapi.config.get('plugin.slug-for-strapi');
    
    // Generate base slug with settings from configuration
    const baseSlug = slugify(text, {
      ...config.slugifyOptions,
      ...options
    });

    console.log('🔄 [Slug For Strapi] Base slug:', baseSlug);

    // Check uniqueness
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      // Find existing entries with this slug
      const existing = await strapi.db.query(contentType).findOne({
        where: { 
          slug: slug,
          ...(excludeId && { documentId: { $ne: excludeId } })
        }
      });

      if (!existing) {
        console.log('✅ [Slug For Strapi] Unique slug found:', slug);
        break;
      }

      slug = `${baseSlug}-${counter}`;
      counter++;
      console.log('🔄 [Slug For Strapi] Trying slug:', slug);
    }

    return slug;
  },

  /**
   * Generates slug for entry
   * @param data - entry data
   * @param contentType - content type
   * @param currentEntity - current entity (for updates)
   * @returns generated slug or null
   */
  async generateSlugForEntry(
    data: Record<string, any>,
    contentType: string,
    currentEntity: Record<string, any> | null = null
  ): Promise<string | null> {
    const excludeId = currentEntity?.documentId;
    console.log(`🔍 [Slug For Strapi] generateSlugForEntry called for ${contentType}`);
    console.log(`📋 [Slug For Strapi] Data:`, JSON.stringify(data, null, 2));
    
    // Get current settings from Strapi config
    const config = strapi.config.get('plugin.slug-for-strapi');
    console.log(`⚙️ [Slug For Strapi] Configuration:`, config);
    
    // Check if plugin is enabled globally
    if (!config.enabled) {
      console.log(`❌ [Slug For Strapi] Plugin disabled globally`);
      return null;
    }

    // Check if enabled for this content-type
    const contentTypeConfig = config.contentTypes[contentType];
    if (contentTypeConfig && contentTypeConfig.enabled === false) {
      console.log(`⚠️ [Slug For Strapi] Generation disabled for ${contentType}`);
      return null;
    }

    // Check if slug generation is skipped (manually locked)
    const skipField = config.skipGenerationField || 'skipSlugGeneration';
    // Check both data (new value) and currentEntity (existing value)
    const isSkipped = data[skipField] === true || 
                     (data[skipField] === undefined && currentEntity?.[skipField] === true);

    if (isSkipped) {
      console.log(`⚠️ [Slug For Strapi] Slug generation skipped due to manual override (${skipField} is true)`);
      return null;
    }

    // If slug already exists, check update settings
    if (data.slug && !config.updateExistingSlugs) {
      console.log(`⚠️ [Slug For Strapi] Slug already exists, skipping: "${data.slug}"`);
      return null;
    }
    
    if (data.slug && config.updateExistingSlugs) {
      console.log(`🔄 [Slug For Strapi] Slug exists, but updating according to settings: "${data.slug}"`);
    }

    console.log(`🔍 [Slug For Strapi] Looking for text in field "${config.sourceField}":`, data[config.sourceField]);

    // Get text from primary field
    let sourceText = this.extractTextFromField(
      data[config.sourceField]
    );

    console.log(`📝 [Slug For Strapi] Extracted text from primary field:`, sourceText);

    // If primary field is empty, try fallback
    if (!sourceText && config.fallbackField) {
      console.log(`🔍 [Slug For Strapi] Trying fallback field "${config.fallbackField}":`, data[config.fallbackField]);
      sourceText = this.extractTextFromField(
        data[config.fallbackField]
      );
      console.log(`📝 [Slug For Strapi] Extracted text from fallback field:`, sourceText);
    }

    if (!sourceText) {
      console.log(`⚠️ [Slug For Strapi] No text found for slug generation in ${contentType}`);
      console.log(`🔍 [Slug For Strapi] Checked fields: ${config.sourceField}, ${config.fallbackField}`);
      return null;
    }

    console.log(`🚀 [Slug For Strapi] Generating slug for ${contentType} from text:`, sourceText);

    // Generate unique slug
    const slug = await this.generateUniqueSlug(
      sourceText,
      contentType,
      excludeId,
      config.slugifyOptions
    );

    console.log(`✅ [Slug For Strapi] Final slug:`, slug);
    return slug;
  },

  /**
   * Processes all content-types and finds those with slug field
   * @returns list of content-types with slug field
   */
  getContentTypesWithSlug(): Array<{
    uid: string;
    displayName: string;
    hasSlugField: boolean;
    hasTitleField: boolean;
    hasNameField: boolean;
  }> {
    const contentTypes = strapi.contentTypes;
    const typesWithSlug = [];

    for (const [uid, contentType] of Object.entries(contentTypes)) {
      // Skip system types
      if (!uid.startsWith('api::')) continue;

      // Check if slug field exists
      if (contentType.attributes && contentType.attributes.slug) {
        typesWithSlug.push({
          uid,
          displayName: contentType.info?.displayName || uid,
          hasSlugField: true,
          hasTitleField: !!contentType.attributes.title,
          hasNameField: !!contentType.attributes.name,
        });
      }
    }

    console.log('📋 [Slug For Strapi] Found content-types with slug field:', typesWithSlug);
    return typesWithSlug;
  }
});
