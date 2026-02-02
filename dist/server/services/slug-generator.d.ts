import type { Core } from '@strapi/strapi';
import type { ContentTypeWithSlug } from '../types';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * Extracts text from field (string)
     * @param {any} fieldValue - field value
     * @returns {string} - text for slug generation
     */
    extractTextFromField(fieldValue: any): string;
    /**
     * Generates unique slug
     * @param {string} text - source text
     * @param {string} contentType - content type
     * @param {number|string} excludeId - ID to exclude from check (for updates)
     * @param {object} options - slugify options
     * @returns {Promise<string>} - unique slug
     */
    generateUniqueSlug(text: string, contentType: string, excludeId?: string | null, options?: any): Promise<string>;
    /**
     * Generates slug for entry
     * @param {object} data - entry data
     * @param {string} contentType - content type
     * @param {object} currentEntity - current entity (for updates)
     * @returns {Promise<string|null>} - generated slug or null
     */
    generateSlugForEntry(data: any, contentType: string, currentEntity?: any): Promise<string | null>;
    /**
     * Processes all content-types and finds those with slug field
     * @returns {Array} - list of content-types with slug field
     */
    getContentTypesWithSlug(): ContentTypeWithSlug[];
};
export default _default;
//# sourceMappingURL=slug-generator.d.ts.map