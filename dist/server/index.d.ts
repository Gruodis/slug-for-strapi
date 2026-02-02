declare const _default: {
    config: {
        default: {
            enabled: boolean;
            sourceField: string;
            fallbackField: string;
            skipGenerationField: string;
            addSuffixForUnique: boolean;
            slugifyOptions: {
                lower: boolean;
                strict: boolean;
                locale: string;
            };
            contentTypes: {};
        };
        validator: (config: any) => void;
    };
    services: {
        'slug-generator': ({ strapi }: {
            strapi: import("@strapi/types/dist/core").Strapi;
        }) => {
            extractTextFromField(fieldValue: any): string;
            generateUniqueSlug(text: string, contentType: string, excludeId?: string | null, options?: any): Promise<string>;
            generateSlugForEntry(data: any, contentType: string, currentEntity?: any): Promise<string | null>;
            getContentTypesWithSlug(): import("./types").ContentTypeWithSlug[];
        };
    };
    controllers: {
        general: ({ strapi }: {
            strapi: import("@strapi/types/dist/core").Strapi;
        }) => {
            findBySlug(ctx: any): Promise<any>;
        };
    };
    routes: any[];
    bootstrap: ({ strapi }: {
        strapi: import("@strapi/types/dist/core").Strapi;
    }) => void;
};
export default _default;
//# sourceMappingURL=index.d.ts.map