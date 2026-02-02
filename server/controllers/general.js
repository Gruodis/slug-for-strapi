'use strict';

module.exports = ({ strapi }) => ({
  async findBySlug(ctx) {
    const { uid, slug } = ctx.params;
    const { locale, publicationState } = ctx.query;

    if (!uid || !slug) {
      return ctx.badRequest('Missing uid or slug');
    }

    try {
      const contentType = strapi.contentType(uid);

      // Prepare query for validation/sanitization
      // We exclude publicationState as it's a v4 legacy param we handle manually
      const queryToValidate = { ...ctx.query };
      delete queryToValidate.publicationState;

      // Validate the query (throws if invalid)
      await strapi.contentAPI.validate.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Sanitize the query to ensure only allowed fields/relations are populated
      const sanitizedQuery = await strapi.contentAPI.sanitize.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Use Strapi v5 Documents API to handle Draft/Publish and Locales correctly
      // Map publicationState to status (default to 'published')
      const status = publicationState === 'preview' || publicationState === 'draft' ? 'draft' : 'published';

      const findParams = {
        filters: { slug },
        status: status,
        populate: sanitizedQuery.populate || '*', // Use sanitized populate or default to '*'
      };

      // Only set locale if it's explicitly provided, otherwise let Strapi default to the default locale
      if (locale) {
        findParams.locale = locale;
      }

      const entity = await strapi.documents(uid).findFirst(findParams);

      if (!entity) {
        return ctx.notFound();
      }

      const sanitizedEntity = await strapi.contentAPI.sanitize.output(entity, strapi.getModel(uid), {
        auth: ctx.state.auth,
      });

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
