export interface Strapi {
  config: {
    get: (path: string) => any;
  };
  db: {
    lifecycles: {
      subscribe: (options: {
        models: string[];
        beforeCreate?: (event: { params: { data: Record<string, any> } }) => Promise<void>;
        beforeUpdate?: (event: { params: { data: Record<string, any>; where: Record<string, any> } }) => Promise<void>;
      }) => void;
    };
    query: (uid: string) => {
      findOne: (params: { where: Record<string, any> }) => Promise<any>;
    };
  };
  contentTypes: Record<string, any>;
  server: {
    router: {
      get: (path: string, handler: (ctx: any, next?: any) => Promise<void>) => void;
      stack: Array<{ path: string }>;
    };
    use: (middleware: (ctx: any, next: any) => Promise<void>) => void;
  };
  controller: (uid: string) => any;
  plugin: (name: string) => {
    service: (name: string) => {
      generateSlugForEntry: (data: Record<string, any>, uid: string, currentEntity?: any) => Promise<string | null>;
      getContentTypesWithSlug: () => Array<{ uid: string; displayName: string }>;
    };
    controller: (name: string) => {
      findBySlug: (ctx: any, next?: any) => Promise<void>;
    };
  };
}

export default ({ strapi }: { strapi: Strapi }): void => {
  // Register universal lifecycle hooks at Strapi startup
  const registerSlugLifecycles = () => {
    console.log('🚀 [Slug For Strapi] Initializing plugin...');
    
    // Get plugin configuration from Strapi
    const pluginConfig = strapi.config.get('plugin::slug-for-strapi') || {};
    console.log('⚙️ [Slug For Strapi] Plugin configuration:', pluginConfig);
    
    const slugService = strapi.plugin('slug-for-strapi').service('slug-generator');
    
    // Get all content-types with slug field
    const contentTypesWithSlug = slugService.getContentTypesWithSlug();
    
    if (contentTypesWithSlug.length === 0) {
      console.log('⚠️ [Slug For Strapi] No content-types found with slug field');
      return;
    }

    // Register lifecycle hooks for each content-type
    contentTypesWithSlug.forEach(({ uid, displayName }) => {
      console.log(`📝 [Slug For Strapi] Registering lifecycle for ${displayName} (${uid})`);
      
      // In Strapi v5 use direct registration via strapi.db.lifecycles
      strapi.db.lifecycles.subscribe({
        models: [uid],
        
        // beforeCreate hook
        async beforeCreate(event) {
          const { data } = event.params;
          console.log(`🆕 [Slug For Strapi] beforeCreate for ${uid}:`, data.title || data.name);
          
          if (!data.slug) {
            const slug = await slugService.generateSlugForEntry(data, uid);
            if (slug) {
              data.slug = slug;
              console.log(`✅ [Slug For Strapi] Slug created: "${slug}"`);
            }
          }
        },

        // beforeUpdate hook
        async beforeUpdate(event) {
          const { data, where } = event.params;
          console.log(`🔄 [Slug For Strapi] beforeUpdate for ${uid}:`, data.title || data.name);
          
          // Generate slug only if it's missing or needs update
          if (data.title || data.name) {
            // Get current entity
            const currentEntity = await strapi.db.query(uid).findOne({ 
              where
            });

            if (!currentEntity) {
              console.warn(`⚠️ [Slug For Strapi] Could not find entity for update. Where:`, where);
              return;
            }
            
            // Try to generate slug (service decides whether to update or not)
            const slug = await slugService.generateSlugForEntry(data, uid, currentEntity);
            if (slug) {
              data.slug = slug;
              console.log(`✅ [Slug For Strapi] Slug updated: "${slug}"`);
            } else if (currentEntity?.slug) {
              console.log(`⚠️ [Slug For Strapi] Slug already exists, skipping: "${currentEntity.slug}"`);
            }
          }
        }
      });
    });
    
    console.log(`✅ [Slug For Strapi] Plugin initialized for ${contentTypesWithSlug.length} content-types`);

    // Override default controllers to inject populate patterns
    const populatePatterns = pluginConfig.populatePatterns || {};
    if (Object.keys(populatePatterns).length > 0) {
      console.log('🔌 [Slug For Strapi] Injecting populate patterns into middlewares...');
      
      const apiPrefix = strapi.config.get('api.rest.prefix') || '/api';
      const endpointsToPatterns: Record<string, any> = {};

      for (const [uid, pattern] of Object.entries(populatePatterns)) {
        if (!pattern) continue;
        
        const ct = strapi.contentTypes[uid];
        if (!ct) continue;
        
        // Map both singular and plural routes just in case, though usually:
        // collection types -> pluralName
        // single types -> singularName
        if (ct.kind === 'singleType') {
          endpointsToPatterns[`${apiPrefix}/${ct.info.singularName}`] = pattern;
        } else {
          endpointsToPatterns[`${apiPrefix}/${ct.info.pluralName}`] = pattern;
        }
      }

      // Inject global middleware to intercept API requests
      strapi.server.use(async (ctx: any, next: any) => {
        // Quick check path start
        if (!ctx.path.startsWith(apiPrefix)) return next();

        // Check if path matches any configured endpoint
        // We match exact endpoint or endpoint/ (for collection types with params)
        for (const [baseEndpoint, pattern] of Object.entries(endpointsToPatterns)) {
          if (ctx.path === baseEndpoint || ctx.path.startsWith(`${baseEndpoint}/`)) {
            // Check if we need to inject populate OR fields
            const hasPopulate = !!ctx.query.populate;
            const hasFields = !!ctx.query.fields;

            if (!hasPopulate || !hasFields) {
               // Check if pattern is a structured query object { fields: [], populate: {} }
               // We assume 'fields' and 'populate' are reserved keys and not attribute names
               const isStructured = pattern && (
                 Object.prototype.hasOwnProperty.call(pattern, 'populate') || 
                 Object.prototype.hasOwnProperty.call(pattern, 'fields')
               );

               if (isStructured) {
                  if (!hasPopulate && pattern.populate) {
                     ctx.query.populate = pattern.populate;
                  }
                  if (!hasFields && pattern.fields) {
                     ctx.query.fields = pattern.fields;
                  }
               } else {
                  // Standard behavior: treat pattern as the populate object
                  if (!hasPopulate) {
                     ctx.query.populate = pattern;
                  }
               }
            }
            break;
          }
        }
        
        await next();
      });
    }

    // Register findBySlug routes for each content-type
    contentTypesWithSlug.forEach(({ uid }) => {
      const contentType = strapi.contentTypes[uid];
      const pluralName = contentType.info.pluralName;
      
      if (!pluralName) {
        console.warn(`⚠️ [Slug For Strapi] Could not determine pluralName for ${uid}`);
        return;
      }

      // Check if route already exists (plugin might re-initialize)
      const routePath = `/api/${pluralName}/slug/:slug`;
      const routes = strapi.server.router.stack.filter((layer: { path: string }) => layer.path === routePath);
      
      if (routes.length > 0) {
        console.log(`ℹ️ [Slug For Strapi] Route already exists, skipping: GET ${routePath}`);
        return;
      }

      console.log(`🛣️ [Slug For Strapi] Registering route: GET ${routePath}`);

      // Add route to Strapi Koa router
      strapi.server.router.get(routePath, async (ctx: any, next?: any) => {
        // Add UID to params for controller
        ctx.params.uid = uid;
        
        // Call controller
        await strapi.plugin('slug-for-strapi').controller('general').findBySlug(ctx, next);
      });
    });
  };

  // Run registration after full Strapi initialization
  registerSlugLifecycles();
};
