export interface Strapi {
  contentType: (uid: string) => any;
  contentTypes: Record<string, any>;
  config: {
    get: (path: string) => any;
  };
  contentAPI: {
    validate: {
      query: (query: Record<string, any>, contentType: any, options: { auth?: any }) => Promise<void>;
    };
    sanitize: {
      query: (query: Record<string, any>, contentType: any, options: { auth?: any }) => Promise<Record<string, any>>;
      output: (entity: any, model: any, options: { auth?: any }) => Promise<any>;
    };
  };
  documents: (uid: string) => {
    findFirst: (params: Record<string, any>) => Promise<any>;
  };
  getModel: (uid: string) => any;
  plugin: (name: string) => {
    controller: (name: string) => {
      findBySlug: (ctx: any, next?: any) => Promise<void>;
    };
  };
  log: {
    error: (error: any) => void;
  };
}

export interface Context {
  params: {
    uid?: string;
    slug?: string;
  };
  query: {
    locale?: string;
    publicationState?: string;
    populate?: string | string[];
    [key: string]: any;
  };
  state: {
    auth?: any;
  };
  body?: any;
  badRequest: (message: string) => void;
  notFound: () => void;
  internalServerError: (message: string) => void;
}

export interface GeneralController {
  findBySlug: (ctx: Context) => Promise<void>;
}

// Helper to recursively build deep populate object
const getDeepPopulate = (strapi: Strapi, uid: string, depth = 3, currentDepth = 0): any => {
  if (currentDepth >= depth) return '*';

  const model = strapi.getModel(uid);
  if (!model) return '*';

  const populate: Record<string, any> = {};

  for (const [attributeName, attribute] of Object.entries(model.attributes || {}) as [string, any][]) {
    if (attribute.type === 'component') {
      populate[attributeName] = {
        populate: getDeepPopulate(strapi, attribute.component, depth, currentDepth + 1),
      };
    } else if (attribute.type === 'dynamiczone') {
      populate[attributeName] = {
        on: (attribute.components || []).reduce((acc: any, componentUID: string) => {
          acc[componentUID] = {
            populate: getDeepPopulate(strapi, componentUID, depth, currentDepth + 1),
          };
          return acc;
        }, {}),
      };
    } else if (attribute.type === 'media' || attribute.type === 'relation') {
      populate[attributeName] = '*';
    }
  }

  return Object.keys(populate).length > 0 ? populate : '*';
};

export default ({ strapi }: { strapi: Strapi }): GeneralController => ({
  async findBySlug(ctx: Context) {
    const { uid, slug } = ctx.params;
    const { locale, publicationState } = ctx.query;

    if (!uid || !slug) {
      return ctx.badRequest('Missing uid or slug');
    }

    try {
      const contentType = strapi.getModel(uid);

      // Prepare query for validation/sanitization
      // We exclude publicationState as it's a v4 legacy param we handle manually
      const queryToValidate = { ...ctx.query };
      delete queryToValidate.publicationState;
      // We exclude locale as it's handled manually as Documents API param
      delete queryToValidate.locale;

      // Validate the query (throws if invalid)
      await strapi.contentAPI.validate.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Sanitize the query to ensure only allowed fields/relations are populated
      const sanitizedQuery = await strapi.contentAPI.sanitize.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Get plugin configuration for depth
      const pluginConfig = strapi.config.get('plugin::slug-for-strapi') as any;
      const defaultDepth = pluginConfig?.defaultPopulateDepth ?? 5;
      const specificDepth = pluginConfig?.populateDepth?.[uid];
      const targetDepth = specificDepth !== undefined ? specificDepth : defaultDepth;

      // Build populate: if user didn't provide one, generate a deep populate based on schema
      let populate = sanitizedQuery.populate;
      if (!populate) {
        populate = getDeepPopulate(strapi, uid, targetDepth);
      } else if (populate === '*') {
        // If user explicitly asked for '*', maybe they wanted deep? Strapi treats * as shallow.
        // For this plugin's specific goal, we can upgrade * to deep default too, but safer to respect explicit * if user meant shallow.
        // However, user prompt says "I want my plugin to populate ... all data ... while frontend use default request".
        // Default request has NO populate param, so sanitizedQuery.populate is undefined.
        // If they send populate=*, sanitizedQuery.populate is '*'.
      }

      // Use Strapi v5 Documents API to handle Draft/Publish and Locales correctly
      const findParams: Record<string, any> = {
        filters: { slug },
        populate: populate || '*', // Fallback to * if deep populate generation failed or returned nothing useful
      };

      // Apply fields if present in sanitized query
      if (sanitizedQuery.fields) {
        findParams.fields = sanitizedQuery.fields;
      }

      // Only set locale if it's explicitly provided, otherwise let Strapi default to the default locale
      if (locale) {
        findParams.locale = locale;
      }

      // Handle publicationState mapping
      // 'preview' -> draft (fallback to published handled by logic if needed, but standard is draft)
      // 'draft' -> draft
      // 'live' (or others) -> published
      if (publicationState === 'preview' || publicationState === 'draft') {
        findParams.status = 'draft';
      } else {
        findParams.status = 'published';
      }

      let entity = await strapi.documents(uid).findFirst(findParams);

      // If 'preview' mode and no draft found, try to find published version
      if (!entity && publicationState === 'preview') {
        findParams.status = 'published';
        entity = await strapi.documents(uid).findFirst(findParams);
      }

      if (!entity) {
        return ctx.notFound();
      }

      const sanitizedEntity = await strapi.contentAPI.sanitize.output(entity, contentType, {
        auth: ctx.state.auth,
      });

      // Filter localizations to include only specific fields if they exist
      if (sanitizedEntity && sanitizedEntity.localizations && Array.isArray(sanitizedEntity.localizations)) {
        sanitizedEntity.localizations = sanitizedEntity.localizations
          .filter(
            (loc: any) =>
              loc &&
              typeof loc.documentId !== 'undefined' &&
              typeof loc.slug !== 'undefined' &&
              typeof loc.locale !== 'undefined'
          )
          .map((loc: any) => ({
            documentId: loc.documentId,
            slug: loc.slug,
            locale: loc.locale
          }));
      }

      ctx.body = { data: sanitizedEntity };
    } catch (error) {
      strapi.log.error(error);
      ctx.internalServerError('An error occurred while fetching the entity by slug');
    }
  },
});
