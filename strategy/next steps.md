# Next Steps

## Frame Image Not Updating Issue

**Problem:** Dynamic frame image created at `/api/frame-image` is not displaying when mini app is posted to Farcaster feed. Still showing old static image.

**What was done:**
- Created dynamic OG image endpoint at `/app/api/frame-image/route.tsx`
- Endpoint fetches live data (tournament info, winners) from Redis
- Generateek graes sldient image with stream countdown, top 3 winners, action pills
- Moved OG metadata from deprecated `head.tsx` to proper `app/layout.tsx` metadata export
- Added OpenGraph and Farcaster frame tags pointing to `https://www.maxcraicpoker.com/api/frame-image`
- Deployed to production

**Current status:**
- Endpoint is working (returns 200, generates PNG)
- Metadata is properly configured in layout.tsx
- But Farcaster still showing old static image when posted

**Potential causes to investigate:**
1. Farcaster frame cache - may need to bust cache or wait for TTL
2. Frame validator/debugger - check if Farcaster sees the new metadata
3. OG tags precedence - possible conflict with other meta tags
4. URL format - check if www subdomain vs non-www matters
5. Deployment timing - verify production build completed successfully

**Next actions:**
- Use Farcaster frame validator to check what meta tags are being read
- Check if there are conflicting OG tags elsewhere in the app
- Consider adding `fc:frame:image:cache` tag to force refresh
- Verify production deployment completed (check Vercel dashboard)
- Test with fresh post after cache period expires
- Consider alternative: Use static image URL that gets regenerated on build

**Files involved:**
- `/app/api/frame-image/route.tsx` - Dynamic image generation
- `/app/layout.tsx:5-25` - OG metadata configuration
- `/app/head.tsx` - May need to be removed if still present
