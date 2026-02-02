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
      // We exclude locale as it's handled manually as Documents API param
      delete queryToValidate.locale;

      // Validate the query (throws if invalid)
      await strapi.contentAPI.validate.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Sanitize the query to ensure only allowed fields/relations are populated
      const sanitizedQuery = await strapi.contentAPI.sanitize.query(queryToValidate, contentType, { auth: ctx.state.auth });

      // Use Strapi v5 Documents API to handle Draft/Publish and Locales correctly
      const findParams = {
        filters: { slug },
        populate: sanitizedQuery.populate || '*', // Use sanitized populate or default to '*'
      };

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

      const sanitizedEntity = await strapi.contentAPI.sanitize.output(entity, strapi.getModel(uid), {
        auth: ctx.state.auth,
      });

      // Filter localizations to include only specific fields if they exist
      if (sanitizedEntity && sanitizedEntity.localizations && Array.isArray(sanitizedEntity.localizations)) {
        sanitizedEntity.localizations = sanitizedEntity.localizations
          .filter(
            (loc) =>
              loc &&
              typeof loc.documentId !== 'undefined' &&
              typeof loc.slug !== 'undefined' &&
              typeof loc.locale !== 'undefined'
          )
          .map(loc => ({
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
