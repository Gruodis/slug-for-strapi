'use strict';

module.exports = ({ strapi }) => {
  // Register universal lifecycle hooks at Strapi startup
  const registerSlugLifecycles = () => {
    console.log('🚀 [Slug For Strapi] Initializing plugin...');
    
    // Get plugin configuration from Strapi
    const pluginConfig = strapi.config.get('plugin.slug-for-strapi') || {};
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
            const currentEntity = await strapi.db.query(uid).findOne({ where });
            
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

    // Register findBySlug routes for each content-type
    contentTypesWithSlug.forEach(({ uid, displayName }) => {
      const contentType = strapi.contentTypes[uid];
      const pluralName = contentType.info.pluralName;
      
      if (!pluralName) {
        console.warn(`⚠️ [Slug For Strapi] Could not determine pluralName for ${uid}`);
        return;
      }

      // Check if route already exists (plugin might re-initialize)
      const routePath = `/api/${pluralName}/slug/:slug`;
      const routes = strapi.server.router.stack.filter(layer => layer.path === routePath);
      
      if (routes.length > 0) {
        console.log(`ℹ️ [Slug For Strapi] Route already exists, skipping: GET ${routePath}`);
        return;
      }

      console.log(`🛣️ [Slug For Strapi] Registering route: GET ${routePath}`);

      // Add route to Strapi Koa router
      strapi.server.router.get(routePath, async (ctx, next) => {
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