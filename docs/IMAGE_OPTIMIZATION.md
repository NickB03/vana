# Image Optimization Implementation

## Overview

This document describes the image optimization strategy implemented for AI-generated images and other media across the application. The implementation focuses on client-side optimizations that improve load times, especially on mobile devices, without requiring server-side image processing.

## Implementation Date

November 25, 2025

## Problem Statement

AI-generated images were served without optimization, leading to:
- Slower page load times on mobile devices
- Unnecessary bandwidth consumption
- Delayed rendering of images below the fold
- Suboptimal perceived performance

## Solution

### 1. Client-Side Lazy Loading

All image elements now include the `loading="lazy"` attribute, which instructs the browser to defer loading of images until they're near the viewport.

**Benefits:**
- Reduces initial page load time
- Decreases bandwidth usage for users who don't scroll to all images
- Native browser support (no JavaScript required)
- Works automatically on all modern browsers

**Implementation:**
```tsx
<img
  src={imageUrl}
  alt={title}
  loading="lazy"
  decoding="async"
/>
```

### 2. Asynchronous Image Decoding

All images include the `decoding="async"` attribute, which allows the browser to decode images off the main thread.

**Benefits:**
- Prevents image decoding from blocking the main thread
- Improves UI responsiveness during image loading
- Better perceived performance
- No visual jank during scrolling

### 3. Components Updated

The following components were updated with image optimization:

#### 3.1 Markdown Components
- **File:** `/src/components/ui/markdown.tsx`
- **File:** `/src/components/prompt-kit/markdown.tsx`
- **Change:** Added custom `img` component with `loading="lazy"` and `decoding="async"`
- **Impact:** Optimizes any images rendered in markdown content (user messages, AI responses)

#### 3.2 Web Search Source Component
- **File:** `/src/components/WebSearchSource.tsx`
- **Change:** Added `decoding="async"` to favicon images
- **Impact:** Improves performance when rendering multiple search results

#### 3.3 Gallery Hover Carousel
- **File:** `/src/components/ui/gallery-hover-carousel.tsx`
- **Change:** Added `decoding="async"` to gallery images
- **Impact:** Smoother carousel interactions

#### 3.4 Already Optimized Components

These components already had `loading="lazy"` and were updated with `decoding="async"`:
- **ArtifactRenderer.tsx** - SVG and image artifact rendering (lines 343-344, 379-384)
- **InlineImage.tsx** - Inline AI-generated images (lines 50-59)
- **ImagePreviewDialog.tsx** - Uses `loading="eager"` intentionally for full-screen preview (line 41)

## Server-Side Considerations

### Current State
The `generate-image` Edge Function currently:
1. Calls OpenRouter Gemini Flash Image API
2. Receives base64-encoded images
3. Uploads to Supabase Storage with retry logic
4. Returns signed URLs with 30-day expiry

### Limitations
Deno Edge Functions don't have native access to image processing libraries like Sharp. Server-side optimization would require:
- Using Deno-compatible image libraries (limited options)
- Adding external image processing service (increased complexity)
- Performance overhead from processing in Edge Function

### Decision
Client-side optimization via native browser features provides sufficient performance improvement without the complexity and overhead of server-side image processing.

### Future Enhancements (Optional)

If server-side optimization becomes necessary in the future, consider:

1. **Supabase Storage Transformations:**
   ```typescript
   // Check if Supabase Storage supports image transformations
   const { data: { publicUrl } } = supabase
     .storage
     .from('ai-images')
     .getPublicUrl(fileName, {
       transform: {
         width: 1920,
         height: 1080,
         quality: 85,
         format: 'webp'
       }
     })
   ```

2. **Responsive srcset (if needed):**
   ```tsx
   <img
     src={imageUrl}
     srcSet={`
       ${imageUrl}?w=400 400w,
       ${imageUrl}?w=800 800w,
       ${imageUrl}?w=1200 1200w
     `}
     sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
     loading="lazy"
     decoding="async"
   />
   ```

3. **WebP Format Conversion:**
   - Would require additional processing step
   - Need fallback for older browsers
   - Increases complexity

## Performance Metrics

### Expected Improvements
- **Initial Page Load:** 20-30% faster for pages with images below the fold
- **Mobile Performance:** Significant improvement on slower connections
- **Bandwidth Savings:** 40-60% reduction for users who don't scroll to all content
- **Time to Interactive:** Improved by deferring non-critical image loads

### Measuring Impact
To measure the impact of these changes:

1. **Lighthouse Scores:**
   ```bash
   npm run lighthouse
   ```
   - Monitor "Largest Contentful Paint" (LCP)
   - Check "Cumulative Layout Shift" (CLS)
   - Review "Time to Interactive" (TTI)

2. **Chrome DevTools:**
   - Network tab: Check image loading waterfall
   - Performance tab: Monitor main thread blocking
   - Coverage tab: Verify lazy-loaded images aren't loaded immediately

3. **Real User Monitoring:**
   - Track page load times
   - Monitor bandwidth usage
   - Measure user engagement metrics

## Browser Support

Both `loading="lazy"` and `decoding="async"` are supported in:
- Chrome 77+
- Firefox 75+
- Safari 15.4+
- Edge 79+

For older browsers, these attributes are safely ignored (graceful degradation).

## Accessibility

All images maintain proper accessibility:
- Descriptive `alt` attributes
- Semantic HTML structure
- No impact on screen readers
- Keyboard navigation unchanged

## Testing Checklist

- [x] Images in markdown render with lazy loading
- [x] AI-generated images (inline) use lazy loading
- [x] Image artifacts use lazy loading
- [x] Web search favicons use lazy loading
- [x] Gallery carousel images use lazy loading
- [x] Full-screen preview uses eager loading (intentional)
- [x] No TypeScript errors
- [x] No runtime errors in browser console
- [x] Images display correctly on mobile
- [x] Images display correctly on desktop

## Related Files

- `/src/components/ui/markdown.tsx`
- `/src/components/prompt-kit/markdown.tsx`
- `/src/components/ArtifactRenderer.tsx`
- `/src/components/InlineImage.tsx`
- `/src/components/ImagePreviewDialog.tsx`
- `/src/components/WebSearchSource.tsx`
- `/src/components/ui/gallery-hover-carousel.tsx`
- `/supabase/functions/generate-image/index.ts`

## Conclusion

This implementation provides significant performance improvements through native browser features without requiring complex server-side processing. The approach is maintainable, has broad browser support, and provides a solid foundation for future enhancements if needed.
