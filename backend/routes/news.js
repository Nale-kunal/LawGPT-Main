import express from 'express';
import Parser from 'rss-parser';
import logger from '../src/utils/logger.js';

const router = express.Router();
const parser = new Parser({
    timeout: 10000,
});

// Trusted Indian Legal RSS Feeds
const RSS_FEEDS = [
    { name: 'LiveLaw', url: 'https://www.livelaw.in/rss' },
    { name: 'Bar & Bench', url: 'https://www.barandbench.com/rss' },
    { name: 'Google News Law India', url: 'https://news.google.com/rss/search?q=Supreme+Court+India+OR+High+Court+India+OR+Bar+Council+India&hl=en-IN&gl=IN&ceid=IN:en' }
];

// Keywords for filtering
const KEYWORDS = [
    'Supreme Court', 'High Court', 'Constitution', 'Constitutional',
    'Bar Council', 'Judgment', 'Ordinance', 'Tribunal', 'PIL',
    'Bench', 'Parliament', 'Amendment', 'Law', 'Legal', 'Justice', 'Advocate'
];

// In-memory cache
let cachedNews = [];
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 15));
        const search = req.query.search?.toString().toLowerCase() || '';
        const sourceFilter = req.query.source?.toString() || '';

        const now = Date.now();

        // Fetch fresh if cache is stale or empty
        if (cachedNews.length === 0 || (now - lastFetch) >= CACHE_DURATION) {
            logger.info('Fetching fresh RSS news');
            const feedPromises = RSS_FEEDS.map(async (source) => {
                try {
                    const feed = await parser.parseURL(source.url);
                    return (feed.items || []).map(item => ({
                        title: item.title,
                        link: item.link,
                        source: source.name,
                        publishedAt: item.isoDate || item.pubDate,
                        summary: (item.contentSnippet || item.content || '').substring(0, 500)
                    }));
                } catch (error) {
                    logger.error({ source: source.name, error: error.message }, 'Failed to fetch RSS feed');
                    return [];
                }
            });

            const results = await Promise.allSettled(feedPromises);
            let allItems = results
                .filter(r => r.status === 'fulfilled')
                .flatMap(r => r.value);

            if (allItems.length > 0) {
                // Deduplicate by title
                const seenTitles = new Set();
                allItems = allItems.filter(item => {
                    const normalizedTitle = item.title?.split('|')[0].toLowerCase().trim();
                    if (!normalizedTitle || seenTitles.has(normalizedTitle)) return false;
                    seenTitles.add(normalizedTitle);
                    return true;
                });

                // Keyword Filtering
                allItems = allItems.filter(item => {
                    const content = `${item.title} ${item.summary}`.toLowerCase();
                    return KEYWORDS.some(keyword => content.includes(keyword.toLowerCase()));
                });

                // Sort by date
                allItems.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

                cachedNews = allItems;
                lastFetch = now;
            }
        }

        // Apply filters to cached data
        let filteredNews = [...cachedNews];

        if (sourceFilter) {
            filteredNews = filteredNews.filter(item => item.source === sourceFilter);
        }

        if (search) {
            filteredNews = filteredNews.filter(item =>
                item.title.toLowerCase().includes(search) ||
                item.summary.toLowerCase().includes(search)
            );
        }

        // Pagination Logic
        const totalItems = filteredNews.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedNews = filteredNews.slice(startIndex, endIndex);

        res.json({
            news: paginatedNews,
            pagination: {
                page,
                limit,
                totalItems,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        logger.error({ error: error.message }, 'Error in news route');
        res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
});

export default router;
