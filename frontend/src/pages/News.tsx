import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Newspaper, ExternalLink, RefreshCw, Search, Clock, BookOpen, Scale, AlertTriangle } from 'lucide-react';

interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedAt: string;
    category: 'Supreme Court' | 'High Court' | 'Legislation' | 'Legal Tech' | 'General';
}

// Curated static legal news as fallback / seed data
const STATIC_NEWS: NewsItem[] = [
    {
        id: '1',
        title: 'Supreme Court Issues Guidelines on Digital Evidence Admissibility',
        summary: 'The Supreme Court has issued comprehensive guidelines on the admissibility of digital evidence in civil and criminal proceedings, emphasizing the need for proper authentication and chain of custody.',
        source: 'Bar & Bench',
        url: 'https://www.barandbench.com',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'Supreme Court',
    },
    {
        id: '2',
        title: 'Amendments to CPC: Key Changes Affecting Civil Litigation',
        summary: 'Parliament has passed amendments to the Code of Civil Procedure introducing mandatory pre-litigation mediation for commercial disputes above ₹1 crore.',
        source: 'Live Law',
        url: 'https://www.livelaw.in',
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        category: 'Legislation',
    },
    {
        id: '3',
        title: 'Delhi High Court: Landlord Cannot Evict Tenant Without 3-Month Notice',
        summary: 'The Delhi High Court has reiterated that landlords must provide a minimum 3-month notice period before initiating eviction proceedings under the Delhi Rent Control Act.',
        source: 'Indian Kanoon',
        url: 'https://indiankanoon.org',
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        category: 'High Court',
    },
    {
        id: '4',
        title: 'BCI Mandates Continuing Legal Education for All Practicing Advocates',
        summary: 'The Bar Council of India has made it mandatory for all practicing advocates to complete 20 hours of Continuing Legal Education (CLE) annually starting from the next financial year.',
        source: 'Bar Council of India',
        url: 'https://www.barcouncilofindia.org',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        category: 'General',
    },
    {
        id: '5',
        title: 'Supreme Court Streamlines E-Filing System for All District Courts',
        summary: 'A new unified e-filing portal has been launched for all district courts across India, allowing lawyers to file cases, track hearing dates, and receive notifications digitally.',
        source: 'eCourts India',
        url: 'https://ecourts.gov.in',
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        category: 'Legal Tech',
    },
    {
        id: '6',
        title: 'Bombay HC: Arbitration Clause in Employment Contracts Enforceable',
        summary: 'The Bombay High Court has held that arbitration clauses in employment contracts are enforceable for disputes arising out of termination, salary disputes, and non-compete agreements.',
        source: 'Mondaq',
        url: 'https://www.mondaq.com',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        category: 'High Court',
    },
    {
        id: '7',
        title: 'New Data Protection Bill: Implications for Legal Professionals',
        summary: 'The Digital Personal Data Protection Act introduces strict obligations for law firms handling client data, including mandatory breach notifications and data minimization requirements.',
        source: 'The Hindu',
        url: 'https://www.thehindu.com',
        publishedAt: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
        category: 'Legislation',
    },
    {
        id: '8',
        title: 'Supreme Court Expands Scope of Legal Aid to Include Appellate Courts',
        summary: 'In a landmark judgment, the Supreme Court has directed NALSA to extend free legal aid services to all appellate courts, ensuring representation for economically weaker sections.',
        source: 'NALSA',
        url: 'https://nalsa.gov.in',
        publishedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        category: 'Supreme Court',
    },
];

const CATEGORY_COLORS: Record<NewsItem['category'], string> = {
    'Supreme Court': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'High Court': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'Legislation': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'Legal Tech': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'General': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const CATEGORY_ICONS: Record<NewsItem['category'], React.ReactNode> = {
    'Supreme Court': <Scale className="h-3 w-3" />,
    'High Court': <Scale className="h-3 w-3" />,
    'Legislation': <BookOpen className="h-3 w-3" />,
    'Legal Tech': <AlertTriangle className="h-3 w-3" />,
    'General': <Newspaper className="h-3 w-3" />,
};

const formatRelativeTime = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};

const News = () => {
    const [news, setNews] = useState<NewsItem[]>(STATIC_NEWS);
    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<NewsItem['category'] | 'All'>('All');
    const [isRefreshing, setIsRefreshing] = useState(false);

    const categories: Array<NewsItem['category'] | 'All'> = ['All', 'Supreme Court', 'High Court', 'Legislation', 'Legal Tech', 'General'];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Simulate refresh — in production, fetch from a legal news API
        await new Promise(resolve => setTimeout(resolve, 800));
        // Shuffle to simulate new content
        setNews([...STATIC_NEWS].sort(() => Math.random() - 0.5));
        setIsRefreshing(false);
    };

    const filtered = news.filter(item => {
        const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
        const matchesSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) || item.summary.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-2 md:space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Legal News</h1>
                    <p className="text-xs text-muted-foreground">Latest updates from Indian courts, legislation, and legal industry</p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRefresh} disabled={isRefreshing}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search news..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-7 text-xs"
                    />
                </div>
                <div className="flex flex-wrap gap-1">
                    {categories.map(cat => (
                        <Button
                            key={cat}
                            size="sm"
                            variant={activeCategory === cat ? 'default' : 'outline'}
                            className="h-7 text-xs px-2"
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Supreme Court', 'High Court', 'Legislation', 'Legal Tech'] as NewsItem['category'][]).map(cat => (
                    <Card key={cat} className="shadow-card-custom cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setActiveCategory(cat)}>
                        <CardContent className="px-3 py-2 flex items-center gap-2">
                            <div className={`p-1.5 rounded-md ${CATEGORY_COLORS[cat]}`}>
                                {CATEGORY_ICONS[cat]}
                            </div>
                            <div>
                                <p className="text-xs font-semibold">{news.filter(n => n.category === cat).length}</p>
                                <p className="text-[10px] text-muted-foreground">{cat}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* News Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No news found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                    {filtered.map(item => (
                        <Card key={item.id} className="shadow-card-custom hover:border-primary/40 transition-colors group">
                            <CardHeader className="p-3 pb-1.5">
                                <div className="flex items-start justify-between gap-2">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[item.category]}`}>
                                        {CATEGORY_ICONS[item.category]}
                                        {item.category}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                                        <Clock className="h-3 w-3" />
                                        {formatRelativeTime(item.publishedAt)}
                                    </div>
                                </div>
                                <CardTitle className="text-xs font-semibold leading-snug mt-1.5 group-hover:text-primary transition-colors">
                                    {item.title}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-3 pb-3 pt-0">
                                <CardDescription className="text-[10px] leading-relaxed line-clamp-3">
                                    {item.summary}
                                </CardDescription>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[10px] text-muted-foreground font-medium">{item.source}</span>
                                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 hover:text-primary">
                                            Read More
                                            <ExternalLink className="h-3 w-3 ml-1" />
                                        </Button>
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default News;
