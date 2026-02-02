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

Example:
- `GET /api/articles/slug/my-awesome-article`

Response:
```json
{
  "data": {
    "id": 1,
    "documentId": "...",
    "title": "My Awesome Article",
    "slug": "my-awesome-article",
    ...
  }
}
```

> **Note:** These endpoints are read-only and public by default.

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
