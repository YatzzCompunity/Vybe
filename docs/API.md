# VYBE Media Platform — Backend API Reference (`/api/v1`)

> **Phase 3 Status Notice:** This document specifies the Phase 3 public read API and double-opt-in newsletter API implemented under `app/api/v1/`. All public read endpoints strictly return **`PUBLISHED`** articles only (`DRAFT`, `IN_REVIEW`, `APPROVED`, and `ARCHIVED` articles are never exposed). All 9 seeded articles are original sample/placeholder fixtures (`isSampleContent: true`).

---

## 1. Conventions & Hardening

### 1.1 Base Path
All Phase 3 endpoints are mounted under:
```text
/api/v1
```

### 1.2 Consistent JSON Response Envelope
Every endpoint returns a deterministic JSON envelope:

- **Success (`200 OK`):**
  ```json
  {
    "data": <T>,
    "meta": { ... }
  }
  ```
- **Error (`400`, `404`, `429`, `500`):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR | BAD_REQUEST | NOT_FOUND | INVALID_OR_EXPIRED_TOKEN | RATE_LIMITED | INTERNAL_SERVER_ERROR",
      "message": "Human-readable safe error description."
    }
  }
  ```
  Internal stack traces, Prisma error codes, SQL queries, and file paths are logged server-side only and are **never** leaked to clients.

### 1.3 Security Headers
All API responses (and `next.config.mjs` route rules) include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-DNS-Prefetch-Control: off`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cache-Control: no-store` on all newsletter/token endpoints

### 1.4 Rate Limiting (In-Memory per Client IP)
Write and token-verification endpoints (`/api/v1/newsletter/subscribe`, `/api/v1/newsletter/confirm`, `/api/v1/newsletter/unsubscribe`) enforce an in-memory per-IP rate limit (`lib/api/rate-limit.ts`):
- **Window:** `60 seconds` (`60,000 ms`)
- **Max Requests per Window per IP per Endpoint:** `10 requests`
- **Response Headers:**
  - `X-RateLimit-Limit: 10`
  - `X-RateLimit-Remaining: <0..10>`
  - `X-RateLimit-Reset: <unix_epoch_seconds>`
  - `Retry-After: <seconds>` (when HTTP `429 Too Many Requests` is returned)

---

## 2. Public Read Endpoints

### 2.1 `GET /api/v1/articles`
Returns a paginated list of **`PUBLISHED`** articles sorted newest-first (`publishedAt DESC, createdAt DESC`).

#### Query Parameters
| Parameter | Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `category` | `string` | No | — | Lowercase slug (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 160 chars) | Filter by active category slug (e.g. `music`, `albums`, `celebrity`). |
| `tag` | `string` | No | — | Lowercase slug (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 160 chars) | Filter by tag slug (e.g. `album-rollout`, `sound-engineering`). |
| `q` | `string` | No | — | Max 200 chars, no control chars | Search filter across title, subtitle, excerpt, body, author, category, and tags. |
| `page` | `integer` | No | `1` | Integer `1..1000` | 1-based page index. |
| `limit` | `integer` | No | `12` | Integer `>= 1`, capped at max `50` | Number of articles per page (values `> 50` are automatically clamped to `50`). |

#### Example Request
```bash
curl -s "http://localhost:3000/api/v1/articles?category=albums&page=1&limit=5"
```

#### Example Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "e4c8a651-1f58-4a1d-9d6a-0c8e8c3f1101",
      "slug": "sample-how-modern-album-rollouts-are-structured",
      "title": "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
      "subtitle": "Placeholder long-form explainer examining how teaser singles, artwork direction, and physical pressing timelines fit together.",
      "excerpt": "SAMPLE PLACEHOLDER: An overview of the standard phases involved in planning a full-length studio record release, used here to test hero typography and featured card layouts.",
      "status": "PUBLISHED",
      "isFeatured": true,
      "isTrending": true,
      "trendingRank": 1,
      "isSampleContent": true,
      "readingTimeMinutes": 4,
      "viewCount": 0,
      "coverGradient": "from-emerald-700 via-teal-700 to-slate-900",
      "coverLabel": "SAMPLE ALBUMS FEATURE • ARTWORK PLACEHOLDER",
      "publishedDisplay": "Sample Fixture • Layout Test",
      "publishedAt": "2026-10-25T09:00:00.000Z",
      "createdAt": "2026-11-01T09:09:42.000Z",
      "updatedAt": "2026-11-01T09:11:05.000Z",
      "category": {
        "id": "...",
        "slug": "albums",
        "name": "Albums",
        "accentColor": "from-emerald-600 via-teal-600 to-cyan-700"
      },
      "author": {
        "id": "...",
        "slug": "editorial-architecture-desk",
        "penName": "Editorial Architecture Desk (Sample)",
        "roleTitle": "Layout & Features Placeholder",
        "avatarUrl": null
      },
      "tags": [
        { "id": "...", "slug": "sample-content", "name": "Sample Content" },
        { "id": "...", "slug": "album-rollout", "name": "Album Rollout" },
        { "id": "...", "slug": "vinyl-packaging", "name": "Vinyl Packaging" },
        { "id": "...", "slug": "editorial-layout", "name": "Editorial Layout" }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 5,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "filters": {
      "category": "albums",
      "tag": null,
      "q": null
    }
  }
}
```

---

### 2.2 `GET /api/v1/articles/[slug]`
Returns a single **`PUBLISHED`** article by slug, including full body content (`bodyMarkdown`, `bodyParagraphs`), author bio, category description, `heroMedia`, and `seoMetadata`.
Returns HTTP `404 Not Found` if the slug does not exist or if the article is in `DRAFT`, `IN_REVIEW`, `APPROVED`, or `ARCHIVED` status.

#### Path Parameters
| Parameter | Type | Required | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- |
| `slug` | `string` | Yes | Lowercase slug (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max 160 chars) | Unique article slug. |

#### Example Request (Found — `200 OK`)
```bash
curl -s "http://localhost:3000/api/v1/articles/sample-how-modern-album-rollouts-are-structured"
```

#### Example Response (`200 OK`)
```json
{
  "data": {
    "id": "...",
    "slug": "sample-how-modern-album-rollouts-are-structured",
    "title": "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
    "subtitle": "Placeholder long-form explainer examining how teaser singles, artwork direction, and physical pressing timelines fit together.",
    "excerpt": "SAMPLE PLACEHOLDER: An overview of the standard phases involved in planning a full-length studio record release, used here to test hero typography and featured card layouts.",
    "status": "PUBLISHED",
    "isFeatured": true,
    "isTrending": true,
    "trendingRank": 1,
    "isSampleContent": true,
    "isAiAssisted": false,
    "editorialNote": "SAMPLE / PLACEHOLDER CONTENT — Seeded from original Phase 1/2 fixture for layout, routing, and Prisma database verification. Not real news.",
    "readingTimeMinutes": 4,
    "viewCount": 0,
    "coverGradient": "from-emerald-700 via-teal-700 to-slate-900",
    "coverLabel": "SAMPLE ALBUMS FEATURE • ARTWORK PLACEHOLDER",
    "publishedDisplay": "Sample Fixture • Layout Test",
    "publishedAt": "2026-10-25T09:00:00.000Z",
    "createdAt": "2026-11-01T09:09:42.000Z",
    "updatedAt": "2026-11-01T09:11:05.000Z",
    "bodyMarkdown": "SAMPLE / PLACEHOLDER CONTENT: This article is a layout test fixture...",
    "bodyHtml": null,
    "bodyParagraphs": [
      "SAMPLE / PLACEHOLDER CONTENT: This article is a layout test fixture...",
      "In a typical full-length album campaign...",
      "Once the core sonic and visual direction is established..."
    ],
    "category": {
      "id": "...",
      "slug": "albums",
      "name": "Albums",
      "description": "Long-form record sequencing, concept architecture, liner notes, and vinyl mastering.",
      "accentColor": "from-emerald-600 via-teal-600 to-cyan-700"
    },
    "author": {
      "id": "...",
      "slug": "editorial-architecture-desk",
      "penName": "Editorial Architecture Desk (Sample)",
      "roleTitle": "Layout & Features Placeholder",
      "bio": "Placeholder editorial profile used to verify byline rendering, author cards, and structured metadata during Phase 1.",
      "avatarUrl": null,
      "isStaff": true
    },
    "tags": [
      { "id": "...", "slug": "sample-content", "name": "Sample Content" },
      { "id": "...", "slug": "album-rollout", "name": "Album Rollout" },
      { "id": "...", "slug": "vinyl-packaging", "name": "Vinyl Packaging" },
      { "id": "...", "slug": "editorial-layout", "name": "Editorial Layout" }
    ],
    "heroMedia": null,
    "seoMetadata": null
  },
  "meta": {
    "slug": "sample-how-modern-album-rollouts-are-structured",
    "categorySlug": "albums"
  }
}
```

#### Example Request (Unknown or Draft Slug — `404 Not Found`)
```bash
curl -s "http://localhost:3000/api/v1/articles/nonexistent-or-draft-slug"
```

#### Example Response (`404 Not Found`)
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Published article with slug 'nonexistent-or-draft-slug' was not found."
  }
}
```

---

### 2.3 `GET /api/v1/categories`
Returns all active categories ordered by `sortOrder` ascending, including `publishedArticleCount` (and alias `articleCount`), counting only `PUBLISHED` articles.

#### Example Request
```bash
curl -s "http://localhost:3000/api/v1/categories"
```

#### Example Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "...",
      "slug": "music",
      "name": "Music",
      "description": "Industry analysis, production workflows, global scenes, and live touring mechanics.",
      "accentColor": "from-indigo-600 via-violet-600 to-purple-700",
      "sortOrder": 1,
      "publishedArticleCount": 1,
      "articleCount": 1
    },
    {
      "id": "...",
      "slug": "celebrity",
      "name": "Celebrity",
      "description": "Public image architecture, brand partnerships, red-carpet styling, and media literacy.",
      "accentColor": "from-rose-600 via-pink-600 to-fuchsia-700",
      "sortOrder": 2,
      "publishedArticleCount": 1,
      "articleCount": 1
    }
  ],
  "meta": {
    "total": 9,
    "totalPublishedArticles": 9
  }
}
```

---

### 2.4 `GET /api/v1/trending`
Returns active `TrendingTopic` records (ordered by `isPinned DESC, score DESC`), trending `PUBLISHED` articles (`isTrending = true`), and featured `PUBLISHED` articles (`isFeatured = true`).

#### Query Parameters
| Parameter | Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `limit` | `integer` | No | `10` | Integer `>= 1`, capped at max `50` | Maximum number of items returned per list (`topics`, `articles`, `featured`). |

#### Example Request
```bash
curl -s "http://localhost:3000/api/v1/trending?limit=5"
```

#### Example Response (`200 OK`)
```json
{
  "data": {
    "topics": [
      {
        "id": "...",
        "slug": "album-rollout",
        "label": "Album Rollout",
        "score": 98.5,
        "velocity": 14.2,
        "isPinned": true,
        "expiresAt": null,
        "updatedAt": "2026-11-01T09:11:05.000Z",
        "category": {
          "id": "...",
          "slug": "albums",
          "name": "Albums"
        }
      }
    ],
    "articles": [
      {
        "id": "...",
        "slug": "sample-how-modern-album-rollouts-are-structured",
        "title": "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
        "status": "PUBLISHED",
        "isFeatured": true,
        "isTrending": true,
        "trendingRank": 1
      }
    ],
    "featured": [
      {
        "id": "...",
        "slug": "sample-how-modern-album-rollouts-are-structured",
        "title": "Sample Feature: How a Modern Album Rollout Is Structured From Studio to Stage",
        "status": "PUBLISHED",
        "isFeatured": true,
        "isTrending": true,
        "trendingRank": 1
      }
    ]
  },
  "meta": {
    "topicCount": 5,
    "trendingArticleCount": 5,
    "featuredArticleCount": 3,
    "limit": 5
  }
}
```

---

### 2.5 `GET /api/v1/search`
Searches **`PUBLISHED`** articles by title, subtitle, excerpt, markdown content, author pen name, category, and tags. Returns the same paginated response envelope as `GET /api/v1/articles`.

#### Query Parameters
| Parameter | Type | Required | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | **Yes** | — | Non-empty string, `1..200` chars | Search terms (whitespace-separated terms are combined with `AND`). |
| `category` | `string` | No | — | Lowercase slug | Optional category slug filter. |
| `tag` | `string` | No | — | Lowercase slug | Optional tag slug filter. |
| `page` | `integer` | No | `1` | Integer `1..1000` | 1-based page number. |
| `limit` | `integer` | No | `12` | Integer `>= 1`, capped at max `50` | Page size. |

#### Example Request
```bash
curl -s "http://localhost:3000/api/v1/search?q=spatial+audio"
```

#### Example Response (`200 OK`)
```json
{
  "data": [
    {
      "id": "...",
      "slug": "sample-understanding-spatial-audio-and-binaural-mixing-formats",
      "title": "Sample Explainer: Understanding Spatial Audio and Binaural Headphone Delivery",
      "subtitle": "Placeholder technical primer on object-based audio mixes versus traditional two-channel stereo masters.",
      "excerpt": "SAMPLE PLACEHOLDER: Testing the Trending section with a primer on immersive mixing workflows and headphone translation checks.",
      "status": "PUBLISHED",
      "isFeatured": false,
      "isTrending": false,
      "trendingRank": null,
      "isSampleContent": true,
      "readingTimeMinutes": 3,
      "viewCount": 0,
      "publishedAt": "2026-10-19T15:10:00.000Z",
      "category": {
        "id": "...",
        "slug": "trending",
        "name": "Trending",
        "accentColor": "from-red-600 via-orange-600 to-amber-600"
      },
      "author": {
        "id": "...",
        "slug": "editorial-architecture-desk",
        "penName": "Editorial Architecture Desk (Sample)",
        "roleTitle": "Layout & Features Placeholder",
        "avatarUrl": null
      },
      "tags": [
        { "id": "...", "slug": "sample-content", "name": "Sample Content" },
        { "id": "...", "slug": "spatial-audio", "name": "Spatial Audio" },
        { "id": "...", "slug": "mixing", "name": "Mixing" },
        { "id": "...", "slug": "audio-formats", "name": "Audio Formats" }
      ]
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 12,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPrevPage": false,
    "query": "spatial audio",
    "filters": {
      "category": null,
      "tag": null,
      "q": "spatial audio"
    }
  }
}
```

#### Example Error (Missing `q` — `400 Bad Request`)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter 'q' is required and must be a non-empty string."
  }
}
```

---

## 3. Newsletter API (Double Opt-In)

> **Email Delivery Notice (TODO for Phase 4+):** No transactional email provider (e.g., Resend / Postmark / SES) is configured in Phase 3. `POST /api/v1/newsletter/subscribe` generates a 32-byte cryptographically random token and persists **only its SHA-256 hex digest** in `NewsletterSubscriber.confirmTokenHash`. The raw token is **never** returned in API responses, stored in plaintext in the database, or logged to stdout/stderr.

### 3.1 `POST /api/v1/newsletter/subscribe`
Validates the email address, creates or updates the `NewsletterSubscriber` record in `PENDING_CONFIRMATION` status with a fresh SHA-256 `confirmTokenHash`, and returns a generic success message that does not reveal whether the email already existed in the database.

- **Rate Limit:** 10 requests per 60 seconds per IP.

#### Request Body (`application/json`)
| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | — | Valid email address (normalized to lowercase, max 254 chars). |
| `frequencyPreference` | `string` | No | `"WEEKLY"` | One of `"DAILY"`, `"WEEKLY"`, or `"BREAKING_ONLY"`. |

#### Example Request
```bash
curl -s -X POST "http://localhost:3000/api/v1/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@example.com","frequencyPreference":"WEEKLY"}'
```

#### Example Response (`200 OK`)
```json
{
  "data": {
    "message": "Subscription request received. If this email address is eligible, a confirmation link will be sent once transactional email delivery is enabled.",
    "status": "PENDING_CONFIRMATION"
  },
  "meta": {
    "doubleOptIn": true,
    "emailDelivery": "TODO_LATER_PHASE"
  }
}
```

---

### 3.2 `GET /api/v1/newsletter/confirm`
Verifies a confirmation token by computing `SHA-256(token)` and matching it against `NewsletterSubscriber.confirmTokenHash` for a `PENDING_CONFIRMATION` subscriber within the 48-hour expiration window. Upon confirmation:
1. Sets `status = "SUBSCRIBED"`.
2. Records `confirmedAt = now()`.
3. Clears `confirmTokenHash = null` (single-use token).

- **Rate Limit:** 10 requests per 60 seconds per IP.

#### Query Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `token` | `string` | **Yes** | Raw confirmation token (hashed server-side with SHA-256 for lookup). |

#### Example Request (Valid Token — `200 OK`)
```bash
curl -s "http://localhost:3000/api/v1/newsletter/confirm?token=<CONFIRMATION_TOKEN>"
```

#### Example Response (`200 OK`)
```json
{
  "data": {
    "message": "Your newsletter subscription has been confirmed.",
    "status": "SUBSCRIBED"
  },
  "meta": {
    "confirmed": true
  }
}
```

#### Example Response (Invalid or Expired Token — `400 Bad Request`)
```json
{
  "error": {
    "code": "INVALID_OR_EXPIRED_TOKEN",
    "message": "The confirmation token is invalid or has expired."
  }
}
```

---

### 3.3 `POST /api/v1/newsletter/unsubscribe`
Marks an existing subscriber as `UNSUBSCRIBED`, sets `unsubscribedAt = now()`, and clears any pending `confirmTokenHash`. Returns a generic success response regardless of whether the email was previously subscribed to prevent address enumeration.

- **Rate Limit:** 10 requests per 60 seconds per IP.

#### Request Body (`application/json`)
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | Valid email address to unsubscribe. |

#### Example Request
```bash
curl -s -X POST "http://localhost:3000/api/v1/newsletter/unsubscribe" \
  -H "Content-Type: application/json" \
  -d '{"email":"reader@example.com"}'
```

#### Example Response (`200 OK`)
```json
{
  "data": {
    "message": "If this email address was subscribed, it has been unsubscribed from the newsletter.",
    "status": "UNSUBSCRIBED"
  },
  "meta": {
    "unsubscribed": true
  }
}
```

---

## 4. Authentication, Profile, Bookmarks & Comments (Phase 4)

Session = Auth.js (NextAuth v4) JWT in an httpOnly, sameSite=lax cookie (`Secure` + `__Secure-` prefix automatically when `NEXTAUTH_URL` is https). Auth.js handlers live under `/api/auth/*` (`signin`, `callback/credentials`, `session`, `signout`, `csrf`). Unauthenticated calls to the endpoints below return `401 {"error":{"code":"UNAUTHORIZED",...}}`. Every endpoint is scoped to the **session user** server-side: IDs in the URL/body can never reach another user's data. Responses with private data send `Cache-Control: no-store`.

| Method & Path | Auth | Purpose | Rate limit |
|---|---|---|---|
| `POST /api/auth/callback/credentials` | – | Email+password login (Auth.js) | 6/min/IP |
| `POST /api/v1/auth/register` | – | `{email,password,displayName}` -> generic 201 anti-enumeration response (equalized bcrypt timing on duplicate) | 6/min/IP |
| `POST /api/v1/auth/forgot-password` | – | `{email}`; identical 200 response for known/unknown emails; stores SHA-256 token hash + 1h expiry. **Email is NOT sent (TODO Phase 5).** | 6/min/IP |
| `POST /api/v1/auth/reset-password` | – | `{token,password}`; single-use, expiring; 400 `INVALID_OR_EXPIRED_TOKEN` otherwise | 6/min/IP |
| `POST /api/v1/auth/change-password` | session | `{currentPassword,newPassword}`; 403 if current password wrong | 6/min/IP |
| `GET /api/v1/me` | session | Own profile | – |
| `PATCH /api/v1/me` | session | `{displayName?,avatarUrl?}` only (URL string, no upload yet) | 10/min/IP |
| `GET /api/v1/me/comments` | session | Own comments, all statuses | – |
| `GET /api/v1/bookmarks[?slug=]` | session | Own bookmarks of PUBLISHED articles | – |
| `POST /api/v1/bookmarks` | session | `{slug}` or `{articleId}`; published only; duplicate -> 409; unknown/unpublished -> 404 | 30/min/IP |
| `DELETE /api/v1/bookmarks?id=` or `?slug=` | session | Deletes own bookmark; someone else's / missing -> 404 | 30/min/IP |
| `GET /api/v1/articles/[slug]/comments` | public | **APPROVED** comments only | – |
| `POST /api/v1/articles/[slug]/comments` | session | `{body}`; created **PENDING** (invisible publicly) | 10/min/IP |
| `PATCH /api/v1/comments/[id]` | session | `{body}`; own + PENDING only | 10/min/IP |
| `DELETE /api/v1/comments/[id]` | session | own + PENDING only | 10/min/IP |

**Comment edit/delete rule:** only the owner, only while `PENDING`. Another user's comment id -> `404` (no existence leak); own but already moderated -> `409 CONFLICT`. Moderation UI/API is Phase 6.

**Public Auth Pages:** `/login`, `/register`, `/forgot-password`, `/reset-password?token=`, `/profile` (middleware redirects anonymous users to `/login`).

**Admin Dashboard UI Routes (`app/admin/`):**
- `/admin` — Overview dashboard with real database counts (articles, users, comments, bookmarks, pageviews tracked: false). Guard: `STAFF_ROLE` (`EDITOR` or `ADMIN`).
- `/admin/articles` — Article list with state filters (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `IN_REVIEW`, `APPROVED`, `ARCHIVED`), search, quick publish/unpublish/delete.
- `/admin/articles/new` — Article creator (creates as `DRAFT`).
- `/admin/articles/[id]` — Article editor, lifecycle controls (publish now, unpublish to draft, future scheduling), curation flags (`isFeatured`, `isTrending`), and per-article SEO metadata editor (`PUT /api/v1/admin/articles/[id]/seo`).
- `/admin/categories` — Category manager (list, create, edit, safe delete).
- `/admin/tags` — Tag manager (list, create, edit, safe/force delete).
- `/admin/authors` — Editorial author profile manager (list, create, edit, delete).
- `/admin/comments` — Comment moderation queue (`PENDING`, `APPROVED`, `REJECTED`, `ALL`, approve, reject, delete).
- `/admin/trending` — Trending topics manager (create, edit, pin, delete) and featured/trending article monitor.
- `/admin/users` — User account and role management (`READER`, `AUTHOR`, `EDITOR`, `ADMIN`). Guard: strictly `ADMIN` role only.

**Admin Access Rules:**
- Anonymous visitors: redirected via middleware to `/login?callbackUrl=/admin`.
- Logged-in non-staff (`READER`, `AUTHOR`): blocked with HTTP `403 Forbidden` in middleware and redirected in page guards.
- User management (`/admin/users`): strictly restricted to `ADMIN` role (`403 Forbidden` for `EDITOR`).

**Google OAuth:** enabled only if both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; otherwise the login page shows a disabled button with a TODO note and no Google provider is registered.

---

## 5. Deferred Endpoints (Phase 5+ TODOs)

1. **Transactional email dispatch (TODO):** newsletter confirmation links and password-reset links are not emailed; no provider is wired.
2. **Scheduled background jobs (TODO Phase 8):** automated periodic cron scanning of external feeds without manual trigger.
3. **Real Google OAuth credentials, avatar upload, email verification, distributed (Redis) rate limiting.**

---

## 6. AI Content Pipeline & Editorial Workflow (Phase 7)

All AI pipeline endpoints are mounted under `/api/v1/admin/` and require role `EDITOR` or `ADMIN` (`STAFF_ROLE`), re-checked on the database for every request. Non-staff (`READER`, `AUTHOR`) and unauthenticated requests return `401` or `403 Forbidden`.

### 6.1 Hard Guardrail: Auto-Publish Prohibition
- **Default Shipped Configuration:** `AI_AUTO_PUBLISH="false"` and `AI_AUTO_PUBLISH_ENABLED_BY_ADMIN="false"`.
- **Architectural Guardrail:** AI-generated content can **NEVER** become `PUBLISHED` directly upon generation. Every draft created by the pipeline is stored with `status = "DRAFT"` (or `"IN_REVIEW"`), `isAiAssisted = true`, and `publishedAt = null`.
- **Double-Gate Protection:** Even if `AI_AUTO_PUBLISH="true"` is set in the environment, automated publication remains strictly blocked in code unless a secondary flag `AI_AUTO_PUBLISH_ENABLED_BY_ADMIN="true"` is also explicitly set.
- **Human Approval Requirement:** Every publication of an AI-assisted article requires an explicit admin/editor action through the standard admin publication flow (`publishArticle`), where the human reviewer verifies sources and quality checks.

### 6.2 Source Allowlist Endpoints

#### `GET /api/v1/admin/sources`
Lists allowlisted news sources (official artist sites, labels, Billboard, Variety, Pitchfork, AP, Reuters, etc.).
- **Query Parameters:** `isEnabled=true|false`, `search=<string>`
- **Response:** `{ "data": [SourceItem], "meta": { "total": <number> } }`

#### `POST /api/v1/admin/sources`
Adds a news domain to the active allowlist.
- **Body:** `{ "name": "Billboard", "domain": "billboard.com", "sourceType": "RSS|PRESS_RELEASE|OFFICIAL_STATEMENT|MANUAL", "trustTier": 1..5, "feedUrl": "https://...", "isEnabled": true }`
- **Response:** `201 Created` with created `Source` record.

#### `GET /api/v1/admin/sources/:id`
Returns single source by ID.

#### `PATCH /api/v1/admin/sources/:id`
Updates source fields or toggles `isEnabled`.

#### `DELETE /api/v1/admin/sources/:id`
Deletes an unused source. Blocked with `409 CONFLICT` if referenced by existing articles.

### 6.3 Editorial Lead Ingestion Endpoints

Lead ingestion records candidate news items for editorial evaluation. **Full-text scraping of copyrighted or paywalled content is strictly prohibited.**

#### `GET /api/v1/admin/leads`
Lists recorded leads with status filter.
- **Query Parameters:** `status=NEW|APPROVED|REJECTED|CONVERTED`, `sourceId=<id>`, `search=<q>`, `page=1`, `limit=50`
- **Response:** `{ "data": [LeadItem], "meta": { "total": <n>, "page": <p>, "limit": <l> } }`

#### `POST /api/v1/admin/leads`
Records a new lead. Validates that the URL domain matches an enabled `Source` on the allowlist.
- **Body:** `{ "title": "Headline", "url": "https://...", "sourceId": "<source-id>", "summary": "Short 2-3 sentence editorial summary", "verifiedFacts": "Bullet points...", "confidenceScore": 0.95 }`
- **Response:** `201 Created` with created `Lead` record.

#### `PATCH /api/v1/admin/leads/:id`
Updates lead status (`APPROVED`, `REJECTED`, `NEW`), verified facts, or summary.

#### `DELETE /api/v1/admin/leads/:id`
Removes a lead record.

### 6.4 Draft Generation Endpoint

#### `POST /api/v1/admin/ai/drafts`
Generates a structured original draft prose from an approved lead or editorial prompt.
- **Rate Limit:** 10 requests / 60 seconds per admin IP.
- **Body:** `{ "leadId"?: "<id>", "categoryId"?: "<id>", "authorId"?: "<id>", "editorialPrompt"?: "<string>", "verifiedFacts"?: "<string>" }`
- **Honest Configuration Guard:** If `AI_PROVIDER_API_KEY` is not set or retains placeholder values, returns `503 Service Unavailable`:
  ```json
  {
    "error": {
      "code": "AI_PROVIDER_NOT_CONFIGURED",
      "message": "TODO: AI provider API key is not configured. Set AI_PROVIDER_API_KEY in environment variables to enable draft generation."
    }
  }
  ```
- **Success (`201 Created`):**
  Returns `{ "data": { "article": <Article>, "qualityReport": <FullQualityReport>, "generatedMetadata": <StoredAiMetadata> } }`. The article is created with `status: "DRAFT"` (or `"IN_REVIEW"`), `isAiAssisted: true`, `publishedAt: null`. Never `PUBLISHED`.

### 6.5 Quality Check Endpoint

#### `POST /api/v1/admin/ai/quality-check`
Runs the pre-review editorial quality checklist across 6 dimensions:
1. **Factual Accuracy:** sources cited, confidence score (0-1), unverified claims flagged.
2. **Grammar & Spelling Pass:** heuristic pass detecting repeated words, unmatched quotes/parentheses, informal excessive punctuation, and run-on sentences.
3. **Duplicate / Plagiarism Risk Check:** compares title & excerpt against database articles (Jaccard token similarity & Levenshtein). Flags overlap >= 35%, rejects exact duplicates.
4. **SEO Metadata Completeness:** meta title length (30-70c), meta description length (80-200c), ogTitle & ogDescription.
5. **Heading Hierarchy:** enforces H2 section headings, checks that H3 follows H2, prohibits H1 in markdown body.
6. **Internal Link Suggestions:** identifies published related articles from DB matching tags/category.
- **Body:** `{ "title": "...", "excerpt": "...", "bodyMarkdown": "...", "categoryId"?: "...", "tags"?: ["..."], "sourcesCited"?: ["..."], "unverifiedClaims"?: ["..."], "currentArticleId"?: "..." }`
- **Response:** `200 OK` with `{ "data": FullQualityReport }`.

### 6.6 Manual Pipeline Scanner Trigger

#### `POST /api/v1/admin/ai/scan`
Executes manual inspection of allowlisted sources and pending leads, reporting active guardrail status and telemetry. CLI runner available via `npm run ai:scan`.

---

## 7. SEO, Sitemap & Syndication Endpoints (Phase 8)

### 7.1 Dynamic Sitemap (`/sitemap.xml`)
- **Method:** `GET /sitemap.xml`
- **Handler:** `app/sitemap.ts` (Next.js MetadataRoute)
- **Response Format:** `application/xml`
- **Description:** Generates a real-time XML sitemap conforming to Sitemaps XML protocol 0.9.
- **Included URLs:**
  - Static public routes: `/` (priority 1.0), `/search` (priority 0.5).
  - Active categories from Prisma (`/music`, `/celebrity`, etc., priority 0.8).
  - Authors with published articles (`/author/editorial-architecture-desk`, etc., priority 0.6).
  - Published articles (`/category/slug`, priority 0.7-0.9).
- **Strict Guardrails:** Strictly excludes unpublished drafts, articles in review, scheduled future articles, archived articles, and private/administrative paths (`/admin`, `/api`, `/profile`, `/login`, `/register`).
- **Timestamps:** Derived directly from database `updatedAt` / `publishedAt`.

### 7.2 Crawl Directives (`/robots.txt`)
- **Method:** `GET /robots.txt`
- **Handler:** `app/robots.ts` (Next.js MetadataRoute)
- **Response Format:** `text/plain`
- **Rules:**
  - `User-Agent: *`
  - `Allow: /`
  - `Disallow: /admin`, `/admin/`, `/api`, `/api/`, `/login`, `/register`, `/profile`, `/reset-password`, `/forgot-password`
  - `Sitemap: <resolved-base-url>/sitemap.xml`
- **Base URL Resolution:** Reads `NEXT_PUBLIC_SITE_URL` (with fallback to `NEXTAUTH_URL` or `"http://localhost:3000"`).

### 7.3 RSS 2.0 Feed (`/feed.xml`)
- **Method:** `GET /feed.xml`
- **Handler:** `app/feed.xml/route.ts`
- **Response Format:** `application/xml; charset=utf-8`
- **Cache-Control:** `public, s-maxage=3600, stale-while-revalidate=86400`
- **Description:** Delivers valid RSS 2.0 channel XML syndicating up to 50 latest published articles.
- **Item Fields:** `<title>`, `<link>`, `<guid>`, `<description>`, `<pubDate>`, `<author>`, `<category>`.
- **Auto-Discovery:** Exposed in HTML `<head>` via `<link rel="alternate" type="application/rss+xml" href="/feed.xml" />`.

### 7.4 RSS Legacy Alias (`/rss.xml`)
- **Method:** `GET /rss.xml`
- **Handler:** `app/rss.xml/route.ts`
- **Response:** HTTP 308 Permanent Redirect to `/feed.xml`.

### 7.5 Public Author Profile Routes
- **`GET /author/[slug]`** (`app/author/[slug]/page.tsx`): Canonical author profile page rendering author bio, role, staff badge, published articles, and JSON-LD `Person` + `BreadcrumbList` schemas.
- **`GET /authors/[slug]`** (`app/authors/[slug]/page.tsx`): Route alias rendering author profile with canonical link pointing to `/author/[slug]`.


