'use strict';

module.exports = ({ strapi }) => ({
  async findBySlug(ctx) {
    const { uid, slug } = ctx.params;
    const { locale, publicationState } = ctx.query;

    if (!uid || !slug) {
      return ctx.badRequest('Missing uid or slug');
    }

    try {
      // Use Strapi v5 Documents API to handle Draft/Publish and Locales correctly
      // Map publicationState to status (default to 'published')
      const status = publicationState === 'preview' || publicationState === 'draft' ? 'draft' : 'published';

      const entity = await strapi.documents(uid).findFirst({
        filters: { slug },
        locale: locale || undefined, // If not provided, Strapi defaults (usually to all or default locale depending on config)
        status: status,
        populate: ctx.query.populate || '*', // Pass populate param from query or default to '*'
      });

      if (!entity) {
        return ctx.notFound();
      }

      const sanitizedEntity = await strapi.contentAPI.sanitize.output(entity, strapi.getModel(uid));

      // Filter localizations to include only specific fields if they exist
      if (sanitizedEntity.localizations && Array.isArray(sanitizedEntity.localizations)) {
        sanitizedEntity.localizations = sanitizedEntity.localizations.map(loc => ({
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
