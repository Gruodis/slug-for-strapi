# Slug For Strapi

## 🚀 Installation

```bash
npm install @gruodis/slug-for-strapi
# or
yarn add @gruodis/slug-for-strapi
```

## Config

`config/plugins.ts`:

```javascript
module.exports = {
  'slug-for-strapi': {
    enabled: true,
    resolve: './node_modules/@gruodis/slug-for-strapi', // Path to the plugin
    config: {
      enabled: true,                    // Enable/disable plugin globally
      sourceField: 'title',             // Primary field to generate slug from
      fallbackField: 'name',            // Fallback field if primary is empty
      addSuffixForUnique: true,         // Add suffixes for uniqueness
      skipGenerationField: 'skipSlugGeneration', // Field to check if slug generation should be skipped (optional)
      updateExistingSlugs: true,        // Update existing slugs when title changes
      slugifyOptions: {
        lower: true,
        strict: true,
        locale: 'lt'
      },
      defaultPopulateDepth: 5,          // Default depth for deep populate (optional, default: 5)
      populateDepth: {                  // Per-content-type depth overrides (optional)
        'api::article.article': 10,
        'api::category.category': 2
      },
      populatePatterns: {               // Per-content-type custom populate objects (optional)
        'api::main-page.main-page': {
          heroCardCarousel: {
            populate: {
              heroCards: true,
            },
          },
          // ... more complex populate logic
        }
      }
    }
  }
};
```

## 📖 Usage

1. **Add a `slug` field** to any content type in your Strapi schema
2. **Create or edit entries** - slugs will be automatically generated from `title` or `name` fields
3. **String support** - Works with regular string fields

### Example Content Type Schema

```json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Articles"
  },
  "attributes": {
    "title": {
      "type": "string"
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    },
    "skipSlugGeneration": {
      "type": "boolean",
      "default": false
    }
  }
}
```

## 🔒 Manual Slug Override (Locking)

To prevent the slug from being auto-updated when you edit the title, you can "lock" it.

1.  Add a **Boolean** field to your content type (e.g., named `skipSlugGeneration`).
2.  Enable this field in the "Configure the view" section of your Content Manager (e.g., place it next to the slug).
3.  When checking this box, the plugin will **not** regenerate the slug, preserving whatever value is in the `slug` field.

You can customize the field name in the plugin configuration:

```javascript
    config: {
      // ...
      skipGenerationField: 'myCustomLockField', // Default is 'skipSlugGeneration'
    }
```

## 🔧 API Endpoints

### 🔍 Find By Slug

For every content type with a generated slug, the plugin automatically creates a GET endpoint:

- `GET /api/:pluralApiId/slug/:slug`

**Features:**
- **Deep Populate by Default:** The endpoint automatically populates all nested components, dynamic zones, and relations up to a configurable depth (default: 5 levels deep).
- **Localized:** Respects the requested locale.
- **Draft/Published:** Respects the `publicationState` parameter (default: `live`).
- **Sanitized:** Response is sanitized to remove sensitive fields based on user permissions.

**Example:**
- `GET /api/articles/slug/my-awesome-article`

**Response:**
```json
{
  "data": {
    "id": 1,
    "documentId": "...",
    "title": "My Awesome Article",
    "slug": "my-awesome-article",
    "seo": { ... }, // Populated component
    "blocks": [ ... ], // Populated dynamic zone
    "author": { ... }, // Populated relation
    ...
  }
}
```

> **Note:** These endpoints are read-only and public by default. You can control the depth of population globally or per-content-type using the plugin configuration (`defaultPopulateDepth` and `populateDepth`), or provide a custom populate schema using `populatePatterns`.

## ⚙️ Advanced Configuration

### Custom Populate Patterns

If `populateDepth` is not flexible enough, you can define exact populate objects for specific content types using `populatePatterns`. This is useful for single types or complex components structures where you need granular control.

**Note:** This affects both the `findBySlug` endpoint (`/api/:pluralApiId/slug/:slug`) AND the standard `find` / `findOne` endpoints (`/api/:pluralApiId` and `/api/:pluralApiId/:documentId`) for that content type, automatically injecting the populate schema if no other populate parameter is provided.

```javascript
// config/plugins.ts
'slug-for-strapi': {
  config: {
    // ...
    populatePatterns: {
      'api::main-page.main-page': {
        heroCardCarousel: {
          populate: {
            heroCards: true,
          },
        },
        seo: {
          fields: ['metaTitle', 'metaDescription'],
          populate: { shareImage: true }
        }
      },
      // Example with top-level fields restriction:
      'api::calendar-event.calendar-event': {
        fields: ['title', 'slug', 'publishDate'],
        populate: {
          tags: true,
          author: {
            fields: ['name', 'email']
          }
        }
      }
    }
  }
}
```

## 📝 Field Types Supported

### Regular String
```json
{
  "title": "My Article Title"
}
```

Will generate: `my-article-title`

## Multi-locale Support

The plugin supports different locales for transliteration. You can change the locale in your `config/plugins.ts`.

## 🔧 Development

```bash


# Install dependencies
npm install

# Build the plugin
npm run build
```

## 📄 License

MIT License.
