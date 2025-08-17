const fs = require('fs');
const path = require('path');

const formatDate = (date) => new Date(date).toISOString().split('T')[0];
const currentDate = formatDate(new Date());
const isIndex = (seo) => seo?.metaRobotsNoindex === 'index';

const generateUrlEntry = ({loc, lastmod, priority, changefreq = 'daily'}) => `
    <url>
        <loc>${loc}</loc>
        <lastmod>${formatDate(lastmod)}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;

const generateSitemapUrlEntry = ({loc, lastmod}) => `
    <sitemap>
        <loc>${loc}</loc>
        <lastmod>${formatDate(lastmod)}</lastmod>
    </sitemap>`;

const generateSitemapXml = (content) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${content.trim()}
</urlset>`;

const generateEntries = ({nodes, baseUrl}) => {
    const uniqueUrls = new Set();
    nodes
        .filter((node) => isIndex(node.pageContext?.seo))
        .forEach((node) => {
            const lastmod = node.pageContext?.modified || currentDate;
            uniqueUrls.add(
                generateUrlEntry({
                    loc: `${baseUrl}${node.path}`,
                    lastmod,
                    priority: '0.7',
                })
            );
        });
    return Array.from(uniqueUrls).join('');
};

const generateBlogSitemap = (data) => {
    const baseUrl = data.site.siteMetadata.siteUrl;
    const blogNodes = data.allSitePage.nodes.filter(
        (node) => node.pageContext?.pageType && node.pageContext.pageType !== 'page'
    );
    const content = generateEntries({nodes: blogNodes, baseUrl});
    return content.trim() ? generateSitemapXml(content) : null;
};

const generatePagesSitemap = (data) => {
    const baseUrl = data.site.siteMetadata.siteUrl;
    const pageNodes = data.allSitePage.nodes.filter((node) => node.pageContext?.pageType === 'page');
    const content = generateEntries({nodes: pageNodes, baseUrl});
    return content.trim() ? generateSitemapXml(content) : null;
};

const generateSitemapIndex = ({data, hasBlog, hasPages}) => {
    const baseUrl = data.site.siteMetadata.siteUrl;
    const links = [];

    if (hasBlog) {
        links.push(generateSitemapUrlEntry({loc: `${baseUrl}/sitemap-blog.xml`, lastmod: currentDate}));
    }
    if (hasPages) {
        links.push(generateSitemapUrlEntry({loc: `${baseUrl}/sitemap-pages.xml`, lastmod: currentDate}));
    }
    if (!links.length) return null;

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${links.join('\n')}
</sitemapindex>`;
};

const generateSitemaps = (data, publicDir) => {
    const isBlogPublic = data.allWp?.nodes?.[0]?.readingSettings?.isBlogPublic;
    const canCreateIndex = isBlogPublic !== false;

    const blogSitemap = generateBlogSitemap(data);
    const pagesSitemap = generatePagesSitemap(data);

    if (blogSitemap) {
        fs.writeFileSync(path.join(publicDir, 'sitemap-blog.xml'), blogSitemap);
    }
    if (pagesSitemap) {
        fs.writeFileSync(path.join(publicDir, 'sitemap-pages.xml'), pagesSitemap);
    }

    if (canCreateIndex && (blogSitemap || pagesSitemap)) {
        const indexXml = generateSitemapIndex({
            data,
            hasBlog: !!blogSitemap,
            hasPages: !!pagesSitemap,
        });
        if (indexXml) {
            fs.writeFileSync(path.join(publicDir, 'sitemap-index.xml'), indexXml);
        }
    }
};

module.exports = {generateSitemaps};
