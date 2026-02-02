declare const _default: {
    'slug-generator': ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => {
        extractTextFromField(fieldValue: any): string;
        generateUniqueSlug(text: string, contentType: string, excludeId?: string | null, options?: any): Promise<string>;
        generateSlugForEntry(data: any, contentType: string, currentEntity?: any): Promise<string | null>;
        getContentTypesWithSlug(): import("../types").ContentTypeWithSlug[];
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map