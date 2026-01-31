# Slug For Strapi

🔗 Universal auto slug generator for all Strapi content types

## ✨ Features

- **Universal** - Works with ANY content type that has a `slug` field
- **Rich Text Support** - Removed in favor of simplicity. Works with string fields.
- **Multiple Field Types** - Supports string fields
- **Cyrillic Support** - Proper transliteration of Russian/Cyrillic characters
- **Smart Uniqueness** - Automatically adds suffixes (-1, -2, -3) for unique slugs
- **Auto-discovery** - Automatically finds and processes all content types with slug fields
- **Configurable** - Update existing slugs or keep them unchanged
- **Zero Configuration** - Works out of the box with sensible defaults
- **🌐 Multi-locale Support** - Choose from 9 different locales for transliteration (ru, en, de, fr, es, it, pl, tr, lt)

## 🚀 Installation

```bash
npm install slug-for-strapi
# or
yarn add slug-for-strapi
```

## ⚙️ Configuration

Add the plugin to your `config/plugins.js` or `config/plugins.ts`:

```javascript
module.exports = {
  'slug-for-strapi': {
    enabled: true,
    config: {
      enabled: true,                    // Enable/disable plugin globally
      sourceField: 'title',             // Primary field to generate slug from
      fallbackField: 'name',            // Fallback field if primary is empty
      addSuffixForUnique: true,         // Add suffixes for uniqueness
      supportCyrillic: true,            // Support Cyrillic transliteration
      updateExistingSlugs: true,        // Update existing slugs when title changes
      slugifyOptions: {
        lower: true,
        strict: true,
        locale: 'ru'
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
    }
  }
}
```

## 🎯 How it Works

1. **Auto-discovery**: Plugin scans all content types for `slug` fields
2. **Lifecycle hooks**: Registers `beforeCreate` and `beforeUpdate` hooks
3. **Smart text extraction**: Automatically detects and processes string fields
4. **Slug generation**: Uses `slugify` with Cyrillic support
5. **Uniqueness check**: Ensures all slugs are unique within the content type

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

## 🌍 Multi-locale Support

The plugin supports different locales for transliteration. You can change the locale in your `config/plugins.ts`.

### Available Locales

| Locale | Language | Example |
|--------|----------|---------|
| `en` | English | `My Article` → `my-article` |


### Examples

**Russian locale (`ru`):**
- `My Article` → `my-article`
- `Test Entry` → `test-entry`

**English locale (`en`):**
- `My Article` → `my-article`
- `Test Entry` → `test-entry`

## 🔧 Development

```bash


# Install dependencies
npm install

# Build the plugin
npm run build
```

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT License - see LICENSE file for details.

## 🐛 Issues

Found a bug? Please create an issue on [GitHub](https://github.com/Gruodis/slug-for-strapi/issues).

## 📦 Related

- [Strapi Documentation](https://docs.strapi.io/)
- [Strapi Plugin Development](https://docs.strapi.io/dev-docs/plugins-development)
