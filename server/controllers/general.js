'use strict';

module.exports = ({ strapi }) => ({
  async findBySlug(ctx) {
    const { uid, slug } = ctx.params;

    if (!uid || !slug) {
      return ctx.badRequest('Missing uid or slug');
    }

    try {
      const entity = await strapi.db.query(uid).findOne({
        where: { slug },
        populate: true,
      });

      if (!entity) {
        return ctx.notFound();
      }

      const sanitizedEntity = await strapi.contentAPI.sanitize.output(entity, strapi.getModel(uid));

      ctx.body = { data: sanitizedEntity };
    } catch (error) {
      strapi.log.error(error);
      ctx.internalServerError('An error occurred while fetching the entity by slug');
    }
  },
});
