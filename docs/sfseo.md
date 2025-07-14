# SEO for Multi-Tenant Storefronts

## What is SEO?

**SEO** (Search Engine Optimization) is the process of improving your website so that it ranks higher in search engine results (like Google or Bing). The goal is to make your site more visible to people searching for products, services, or information related to your business.

### How SEO Helps Your Site
- **Increases Visibility:** Higher rankings mean more people can find your site.
- **Drives Organic Traffic:** Good SEO brings visitors to your site without paid ads.
- **Builds Trust and Credibility:** Sites that appear at the top of search results are seen as more trustworthy.
- **Improves User Experience:** SEO encourages clear structure, fast loading, and mobile-friendly design.
- **Boosts Sales and Leads:** More visitors can lead to more sales, sign-ups, or other goals.

---

## How SEO Works

1. **Crawling:** Search engines use bots ("crawlers") to discover your pages.
2. **Indexing:** They analyze and store information about your pages (content, meta tags, images, links, etc.).
3. **Ranking:** When someone searches, the engine ranks pages based on relevance, quality, and other factors.
4. **Displaying Results:** The most relevant and high-quality pages appear higher in search results.

### Key SEO Factors
- **Relevant Content:** Pages should answer the searcher’s questions.
- **Keywords:** Use words and phrases people are searching for.
- **Meta Tags:** Titles and descriptions help search engines understand your pages.
- **Mobile-Friendly:** Sites should work well on phones and tablets.
- **Page Speed:** Faster sites rank better.
- **Backlinks:** Links from other trusted sites boost your authority.
- **User Experience:** Easy navigation and clear structure help both users and search engines.

---

## How SEO Integrates with InstantDB

With InstantDB, you can store and update SEO-related content for each storefront, such as:
- Page titles and meta descriptions
- Canonical URLs
- Open Graph and Twitter Card tags
- Structured data (JSON-LD)
- Sitemap information

Your website should use this data to render SEO tags in the HTML for each page. When you update SEO data in InstantDB, it is reflected instantly on your storefront.

---

## How Search Engines Use Your SEO Data

When your site outputs proper SEO tags and content (even if the data comes from InstantDB), search engines like Google will:
1. **Crawl** your site by visiting your pages.
2. **Read** the SEO tags and content you serve.
3. **Index** your pages based on this information.
4. **Rank** your site in search results according to relevance and quality.

As long as your pages are publicly accessible and have the right SEO tags in the HTML, Google and other search engines will automatically scan, index, and rank your site for search results.

---

## Best Practices for SEO in Multi-Tenant Platforms

- **Custom Domains:** Each store on a custom domain (`acmestore.com`) gets its own SEO profile and ranking.
- **Subdomains:** Stores on subdomains (`acmestore.tarapp.com`) are treated as separate sites by search engines.
- **Path-based URLs:** Stores at paths (`tarapp.com/store/acme-123`) are part of your main site’s SEO.
- **Canonical URLs:** Always set the canonical URL to the preferred domain to avoid duplicate content issues.
- **Sitemaps:** Generate and submit sitemaps for each custom domain or subdomain.
- **Meta Tags:** Ensure each store’s pages have unique titles, descriptions, and Open Graph tags.
- **301 Redirects:** If a user switches from a path or subdomain to a custom domain, set up 301 redirects from the old URL to the new one to preserve SEO value.

---

## Summary

SEO is essential for helping people find your site through search engines. By managing SEO data in InstantDB and ensuring your storefront outputs the right tags and content, you enable Google and others to automatically scan, index, and rank your site for relevant searches.
