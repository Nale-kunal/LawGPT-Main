import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Newspaper,
    ExternalLink,
    RefreshCw,
    Clock,
    Scale,
    AlertTriangle,
    Search,
    ChevronLeft,
    ChevronRight,
    Filter,
    X
} from 'lucide-react';

interface PaginationMetadata {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface NewsItem {
    title: string;
    link: string;
    source: string;
    publishedAt: string;
    summary: string;
}

const formatRelativeTime = (isoDate: string) => {
    try {
        const diff = Date.now() - new Date(isoDate).getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    } catch (e) {
        return 'Recently';
    }
};

const LegalNews: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedSource, setSelectedSource] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const sources = ['LiveLaw', 'Bar & Bench', 'Google News Law India'];

    const fetchNews = useCallback(async (page = 1, search = '', source = '', silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12',
                search: search,
                source: source || ''
            });

            const response = await fetch(`/api/news?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch legal news');
            const data = await response.json();

            setNews(data.news || []);
            setPagination(data.pagination || null);
            setCurrentPage(data.pagination?.page || 1);
        } catch (err) {
            console.error('Error fetching news:', err);
            setError('Could not load latest news updates.');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // Handle Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Fetch when search, filter or page change
    useEffect(() => {
        fetchNews(currentPage, debouncedSearch, selectedSource || '');
    }, [currentPage, debouncedSearch, selectedSource, fetchNews]);

    // Reset pagination on search/filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, selectedSource]);

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchNews(currentPage, debouncedSearch, selectedSource || '', true);
    };

    const handlePageChange = (page: number) => {
        if (page >= 1 && pagination && page <= pagination.totalPages) {
            setCurrentPage(page);
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setSelectedSource(null);
        setCurrentPage(1);
    };

    // Pagination helper to show page numbers
    const renderPageNumbers = () => {
        if (!pagination) return null;
        const pages = [];
        const total = pagination.totalPages;
        const current = pagination.page;

        for (let i = 1; i <= total; i++) {
            if (
                i === 1 ||
                i === total ||
                (i >= current - 1 && i <= current + 1)
            ) {
                pages.push(
                    <Button
                        key={i}
                        variant={current === i ? "default" : "outline"}
                        size="icon"
                        className={`h-7 w-7 text-[10px] ${current === i ? '' : 'border-transparent hover:border-accent hover:border-2'}`}
                        onClick={() => handlePageChange(i)}
                    >
                        {i}
                    </Button>
                );
            } else if (i === current - 2 || i === current + 2) {
                pages.push(<span key={i} className="px-1 text-muted-foreground text-[10px]">...</span>);
            }
        }
        return pages;
    };

    return (
        <div className="space-y-3">
            {/* Header and Controls */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                        <Scale className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        Indian Legal Updates
                    </h1>
                    <p className="text-xs text-muted-foreground">Manage your legal knowledge and stay updated</p>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-medium border-transparent hover:border-accent hover:border-2 transition-all"
                    onClick={handleRefresh}
                    disabled={isRefreshing || loading}
                >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? 'Updating...' : 'Refresh'}
                </Button>
            </div>

            {/* Controls Card */}
            <Card className="border border-transparent hover:border-accent hover:border-2 transition-all shadow-sm">
                <CardHeader className="pb-1">
                    <CardTitle className="text-sm">Search & Filter News</CardTitle>
                </CardHeader>
                <CardContent className="pt-1">
                    <div className="flex flex-wrap gap-2">
                        <div className="flex-1 min-w-48 relative">
                            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search judgments, acts, bills..."
                                className="pl-8 h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all bg-muted/50 focus:bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            {sources.map(source => (
                                <Badge
                                    key={source}
                                    variant={selectedSource === source ? "default" : "outline"}
                                    className={`cursor-pointer px-2 py-0.5 text-[10px] transition-all ${selectedSource === source ? '' : 'border-border hover:border-accent bg-muted/10 hover:bg-muted/30'}`}
                                    onClick={() => setSelectedSource(selectedSource === source ? null : source)}
                                >
                                    {source}
                                </Badge>
                            ))}
                            {(searchTerm || selectedSource) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2 font-bold text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                    onClick={clearFilters}
                                >
                                    Clear
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="h-40 rounded-xl border border-transparent bg-muted/20 animate-pulse shadow-sm" />
                    ))}
                </div>
            ) : error && (!news || news.length === 0) ? (
                <Card className="text-center py-12 border border-transparent hover:border-accent hover:border-2 transition-all">
                    <CardContent>
                        <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive/50" />
                        <p className="text-sm font-medium">{error}</p>
                        <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={() => fetchNews(1, debouncedSearch, selectedSource || '')}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            ) : (!news || news.length === 0) ? (
                <Card className="text-center py-12 border border-transparent hover:border-accent hover:border-2 transition-all border-dashed">
                    <CardContent>
                        <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm text-muted-foreground">No updates found matching your criteria.</p>
                        <Button variant="link" size="sm" className="mt-1 text-xs" onClick={clearFilters}>
                            Reset filters
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {news.map((item, index) => (
                            <Card key={`${item.link}-${index}`} className="shadow-card-custom border border-transparent hover:border-accent hover:border-2 hover:bg-transparent transition-all group flex flex-col">
                                <CardHeader className="p-3 pb-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <Badge variant="secondary" className="text-[9px] font-semibold tracking-tight uppercase bg-primary/10 text-primary border-none h-4 px-1">
                                            {item.source}
                                        </Badge>
                                        <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-medium">
                                            <Clock className="h-2.5 w-2.5" />
                                            {formatRelativeTime(item.publishedAt)}
                                        </div>
                                    </div>
                                    <CardTitle className="text-sm font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                        {item.title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 pt-1 flex-1 flex flex-col">
                                    <p className="text-[11px] leading-relaxed line-clamp-3 mb-3 text-foreground/70 flex-1">
                                        {(item.summary || '').substring(0, 200)}
                                    </p>
                                    <div className="flex items-center justify-end">
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full"
                                        >
                                            <Button variant="outline" size="sm" className="w-full h-7 text-[10px] font-semibold border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all">
                                                Read Full Article
                                                <ExternalLink className="h-2.5 w-2.5 ml-1.5" />
                                            </Button>
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Numbered Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-1 pt-6 pb-4">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-transparent hover:border-accent hover:border-2"
                                disabled={!pagination.hasPrev}
                                onClick={() => handlePageChange(currentPage - 1)}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>

                            <div className="flex items-center gap-1 mx-1">
                                {renderPageNumbers()}
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 border-transparent hover:border-accent hover:border-2"
                                disabled={!pagination.hasNext}
                                onClick={() => handlePageChange(currentPage + 1)}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default LegalNews;
