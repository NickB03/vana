/**
 * API Domain Whitelist for Artifact System
 *
 * This whitelist defines which external APIs artifacts are allowed to call.
 * All APIs listed here have been verified for:
 * - CORS support (cross-origin requests allowed)
 * - Free tier availability
 * - Stable, maintained endpoints
 *
 * @see docs/ARTIFACT_SYSTEM.md#api-access for usage guidelines
 */

export interface APIWhitelistEntry {
  domain: string;
  category: string;
  requiresAuth: boolean;
  freeQuota?: string;
  description: string;
}

/**
 * Tier 1: No Authentication Required
 * These APIs work immediately with no setup
 */
export const TIER_1_NO_AUTH: APIWhitelistEntry[] = [
  // Data & Testing
  {
    domain: "jsonplaceholder.typicode.com",
    category: "testing",
    requiresAuth: false,
    description: "Fake REST API for testing and prototyping"
  },
  {
    domain: "dummyjson.com",
    category: "testing",
    requiresAuth: false,
    description: "Rich test data (products, users, carts, recipes)"
  },
  {
    domain: "reqres.in",
    category: "testing",
    requiresAuth: false,
    description: "Simulated user data and HTTP responses"
  },
  {
    domain: "httpbin.org",
    category: "testing",
    requiresAuth: false,
    description: "HTTP request testing and debugging"
  },
  {
    domain: "run.mocky.io",
    category: "testing",
    requiresAuth: false,
    description: "Custom JSON mock responses"
  },

  // Gaming & Entertainment
  {
    domain: "pokeapi.co",
    category: "gaming",
    requiresAuth: false,
    description: "Comprehensive Pokemon data (900+ species)"
  },
  {
    domain: "official-joke-api.appspot.com",
    category: "entertainment",
    requiresAuth: false,
    description: "Random jokes database"
  },
  {
    domain: "randomuser.me",
    category: "testing",
    requiresAuth: false,
    description: "Random user data generator"
  },
  {
    domain: "www.boredapi.com",
    category: "entertainment",
    requiresAuth: false,
    description: "Activity suggestions"
  },

  // Geography & Countries
  {
    domain: "restcountries.com",
    category: "geography",
    requiresAuth: false,
    description: "Comprehensive country data (population, flags, languages)"
  },
  {
    domain: "api.zippopotam.us",
    category: "geography",
    requiresAuth: false,
    description: "Postal code data worldwide"
  },

  // Images & Media
  {
    domain: "random.dog",
    category: "images",
    requiresAuth: false,
    description: "Random dog images"
  },
  {
    domain: "dog.ceo",
    category: "images",
    requiresAuth: false,
    description: "Dog images by breed (20,000+ images)"
  },
  {
    domain: "aws.random.cat",
    category: "images",
    requiresAuth: false,
    description: "Random cat images"
  },
  {
    domain: "cataas.com",
    category: "images",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "Cat as a service (with text overlay support)"
  },
  {
    domain: "picsum.photos",
    category: "images",
    requiresAuth: false,
    description: "Lorem Picsum - placeholder images"
  },
  {
    domain: "ui-avatars.com",
    category: "images",
    requiresAuth: false,
    description: "Generated avatar images from initials"
  },
  {
    domain: "api.dicebear.com",
    category: "images",
    requiresAuth: false,
    description: "Avatar generation with multiple styles"
  },

  // Reference & Dictionary
  {
    domain: "api.dictionaryapi.dev",
    category: "reference",
    requiresAuth: false,
    description: "Free English dictionary API"
  },
  {
    domain: "numbersapi.com",
    category: "reference",
    requiresAuth: false,
    description: "Fun facts about numbers"
  },
  {
    domain: "api.quotable.io",
    category: "reference",
    requiresAuth: false,
    description: "Random quotes database"
  },

  // Weather (no auth required!)
  {
    domain: "api.open-meteo.com",
    category: "weather",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "Free weather API (no key required)"
  },
  {
    domain: "api.weather.gov",
    category: "weather",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "US National Weather Service - forecasts, alerts, radar (US only)"
  },

  // Food & Recipes
  {
    domain: "www.themealdb.com",
    category: "food",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "Recipe database with ingredients, categories, and images"
  },

  // Fun & Random
  {
    domain: "catfact.ninja",
    category: "entertainment",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "Random cat facts API"
  },

  // US Government Data
  {
    domain: "datausa.io",
    category: "data",
    requiresAuth: false,
    freeQuota: "Unlimited",
    description: "US demographic and economic statistics"
  },
];

/**
 * Tier 2: Free API Key Required (Generous Free Tiers)
 * These require registration but have excellent free quotas
 */
export const TIER_2_FREE_KEY: APIWhitelistEntry[] = [
  // Weather
  {
    domain: "api.openweathermap.org",
    category: "weather",
    requiresAuth: true,
    freeQuota: "1,000 calls/day",
    description: "OpenWeatherMap - comprehensive weather data"
  },
  {
    domain: "api.weatherapi.com",
    category: "weather",
    requiresAuth: true,
    freeQuota: "1M calls/month",
    description: "WeatherAPI - current and forecast data"
  },
  {
    domain: "api.visualcrossing.com",
    category: "weather",
    requiresAuth: true,
    freeQuota: "1,000 records/day",
    description: "Visual Crossing Weather - timeline weather and historical data"
  },

  // News & Content
  {
    domain: "newsapi.org",
    category: "news",
    requiresAuth: true,
    freeQuota: "100 requests/day",
    description: "News from 80,000+ sources worldwide"
  },
  {
    domain: "content.guardianapis.com",
    category: "news",
    requiresAuth: true,
    freeQuota: "5,000 calls/day",
    description: "The Guardian news content"
  },
  {
    domain: "newsdata.io",
    category: "news",
    requiresAuth: true,
    freeQuota: "200 requests/day",
    description: "Global news with region/language filters"
  },
  {
    domain: "worldnewsapi.com",
    category: "news",
    requiresAuth: true,
    freeQuota: "Hundreds of requests/day",
    description: "Global news feed with filters and search"
  },

  // Finance & Crypto
  {
    domain: "api.coingecko.com",
    category: "finance",
    requiresAuth: false, // Free tier needs no key!
    freeQuota: "30 calls/min",
    description: "Cryptocurrency prices and market data"
  },
  {
    domain: "api.coinbase.com",
    category: "finance",
    requiresAuth: false,
    description: "Bitcoin price index"
  },
  {
    domain: "api.exchangerate-api.com",
    category: "finance",
    requiresAuth: true,
    freeQuota: "1,500 requests/month",
    description: "Currency exchange rates"
  },

  // Developer Tools
  {
    domain: "api.github.com",
    category: "developer",
    requiresAuth: false, // 60 requests/hour without auth
    freeQuota: "60 req/hr (no auth), 5000 req/hr (with token)",
    description: "GitHub repositories, users, issues"
  },
  {
    domain: "api.jsonbin.io",
    category: "developer",
    requiresAuth: true,
    freeQuota: "Free tier available",
    description: "JSON storage and retrieval"
  },
  {
    domain: "ip-api.com",
    category: "developer",
    requiresAuth: false,
    freeQuota: "45 requests/min",
    description: "IP geolocation"
  },
  {
    domain: "ipapi.co",
    category: "developer",
    requiresAuth: false,
    freeQuota: "1,000 requests/day",
    description: "IP geolocation and ASN data"
  },

  // Creative & Fun
  {
    domain: "api.nasa.gov",
    category: "space",
    requiresAuth: true,
    freeQuota: "1,000 requests/hour",
    description: "NASA data (APOD, Mars photos, astronomy)"
  },
  {
    domain: "api.themoviedb.org",
    category: "entertainment",
    requiresAuth: true,
    freeQuota: "Free with key",
    description: "Movie and TV show database"
  },
  {
    domain: "openlibrary.org",
    category: "books",
    requiresAuth: false,
    description: "Open Library book data"
  },
  {
    domain: "api.lyrics.ovh",
    category: "music",
    requiresAuth: false,
    description: "Song lyrics search"
  },

  // Geocoding & Maps
  {
    domain: "nominatim.openstreetmap.org",
    category: "geocoding",
    requiresAuth: false,
    freeQuota: "1 request/sec",
    description: "OpenStreetMap geocoding and address search"
  },

  // Storage & Mocking
  {
    domain: "getpantry.cloud",
    category: "storage",
    requiresAuth: false,
    freeQuota: "100 MB free",
    description: "Free JSON storage buckets (simulate backend)"
  },
];

/**
 * Tier 3: Specialized Services
 * Use with caution due to rate limits or specific use cases
 */
export const TIER_3_SPECIALIZED: APIWhitelistEntry[] = [
  {
    domain: "api.qrserver.com",
    category: "utility",
    requiresAuth: false,
    description: "QR code generation"
  },
  {
    domain: "is.gd",
    category: "utility",
    requiresAuth: false,
    freeQuota: "Rate limited",
    description: "URL shortening"
  },
  {
    domain: "tinyurl.com",
    category: "utility",
    requiresAuth: false,
    freeQuota: "Rate limited",
    description: "URL shortening"
  },
];

/**
 * Combined whitelist of all allowed API domains
 */
export const ALL_ALLOWED_DOMAINS = [
  ...TIER_1_NO_AUTH,
  ...TIER_2_FREE_KEY,
  ...TIER_3_SPECIALIZED,
].map(entry => entry.domain);

/**
 * Blocked domains for security reasons
 */
export const BLOCKED_DOMAINS = [
  // Localhost and private networks
  "localhost",
  "127.0.0.1",
  /^192\.168\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,

  // Tunneling services (potential security risk)
  /\.ngrok\.io$/,
  /\.localtunnel\.me$/,
  /\.localhost\.run$/,

  // Free domains with abuse history
  /\.tk$/,
  /\.ml$/,
  /\.ga$/,
  /\.cf$/,
];

/**
 * Check if a URL is allowed to be called from artifacts
 */
export function isAllowedAPIUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Check if domain is blocked
    for (const blocked of BLOCKED_DOMAINS) {
      if (typeof blocked === 'string') {
        if (hostname === blocked || hostname.endsWith('.' + blocked)) {
          return false;
        }
      } else if (blocked instanceof RegExp) {
        if (blocked.test(hostname)) {
          return false;
        }
      }
    }

    // Check if domain is explicitly allowed
    return ALL_ALLOWED_DOMAINS.some(domain =>
      hostname === domain || hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

/**
 * Get API information by domain
 */
export function getAPIInfo(domain: string): APIWhitelistEntry | undefined {
  return [
    ...TIER_1_NO_AUTH,
    ...TIER_2_FREE_KEY,
    ...TIER_3_SPECIALIZED,
  ].find(entry => entry.domain === domain);
}

/**
 * Get all APIs by category
 */
export function getAPIsByCategory(category: string): APIWhitelistEntry[] {
  return [
    ...TIER_1_NO_AUTH,
    ...TIER_2_FREE_KEY,
    ...TIER_3_SPECIALIZED,
  ].filter(entry => entry.category === category);
}

/**
 * Get all available categories
 */
export function getCategories(): string[] {
  const categories = new Set([
    ...TIER_1_NO_AUTH,
    ...TIER_2_FREE_KEY,
    ...TIER_3_SPECIALIZED,
  ].map(entry => entry.category));

  return Array.from(categories).sort();
}
