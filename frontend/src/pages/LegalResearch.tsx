import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  Scale,
  Gavel,
  FileText,
  Star,
  Copy,
  ExternalLink,
  Filter,
  SortAsc,
  Sparkles,
  Landmark,
  X,
  Zap,
  Brain,
  ServerCrash,
} from 'lucide-react';
import JuriqLoader from '@/components/ui/JuriqLoader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ErrorScreen = ({ message }: { message: string }) => (
  <div className="flex items-center justify-center py-12">
    <Card className="text-center py-12 border border-transparent border-dashed w-full max-w-md">
      <CardContent>
        <ServerCrash className="h-10 w-10 mx-auto mb-3 text-destructive/50" />
        <h3 className="text-lg font-semibold">System Error</h3>
        <p className="text-sm text-muted-foreground mt-1">{message}</p>
      </CardContent>
    </Card>
  </div>
);
import { useToast } from '@/hooks/use-toast';
import { searchLegal, semanticSearchLegal, explainLegal, type LegalResult } from '@/services/legalApi';
import {
  searchStaticData,
} from '@/services/staticLegalData';

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type SearchMode = 'hybrid' | 'semantic' | 'keyword';

// ─── Icon helper ──────────────────────────────────────────────────────────────
function getResultIcon(item: LegalResult) {
  if (item.type === 'case') return <Landmark className="h-4 w-4 text-primary" />;
  const sub = (item.subtitle || '').toLowerCase();
  if (sub.includes('penal code') || sub.includes('ipc')) return <Gavel className="h-4 w-4 text-destructive" />;
  if (sub.includes('criminal procedure') || sub.includes('crpc')) return <FileText className="h-4 w-4 text-warning" />;
  if (sub.includes('contract')) return <Scale className="h-4 w-4 text-primary" />;
  return <BookOpen className="h-4 w-4 text-muted-foreground" />;
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'act': return <Badge variant="default" className="text-[10px] h-4 px-1">Act/Section</Badge>;
    case 'case': return <Badge variant="secondary" className="text-[10px] h-4 px-1">Case Law</Badge>;
    case 'section': return <Badge variant="outline" className="text-[10px] h-4 px-1">Section</Badge>;
    default: return null;
  }
}

// ─── Result Card ──────────────────────────────────────────────────────────────
interface ResultCardProps {
  item: LegalResult;
  isFavorited: boolean;
  onToggleFavorite: (id: string) => void;
  onCopy: (text: string) => void;
  onAiAssist: (item: LegalResult) => void;
  aiLoading: boolean;
  aiExplanation: string | null;
}

function ResultCard({
  item, isFavorited, onToggleFavorite, onCopy, onAiAssist, aiLoading, aiExplanation
}: ResultCardProps) {
  const copyText = [
    item.title,
    item.subtitle || '',
    '',
    item.description,
  ].join('\n').trim();

  // @ts-expect-error - dynamic properties from API
  const semanticScore = item.semanticScore || 0;

  return (
    <Card className="shadow-card-custom hover:shadow-elevated transition-shadow">
      <CardHeader className="pb-1.5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getResultIcon(item)}
              <CardTitle className="text-sm leading-snug">{item.title}</CardTitle>
              {semanticScore > 0.4 && (
                <Badge variant="outline" className="h-4 px-1 text-[9px] border-primary/30 text-primary bg-primary/5 flex items-center gap-0.5">
                  <Brain className="h-2 w-2" /> Semantic Match
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleFavorite(item.id)}
                className={`h-6 w-6 p-0 shrink-0 ${isFavorited ? 'text-warning' : ''}`}
              >
                <Star className={`h-3.5 w-3.5 ${isFavorited ? 'fill-current' : ''}`} />
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getTypeBadge(item.type)}
              {item.subtitle && (
                <span className="text-[10px] text-muted-foreground">{item.subtitle}</span>
              )}
            </div>
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onCopy(copyText)} title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {item.sourceLink && (
              <Button
                variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => window.open(item.sourceLink, '_blank', 'noopener,noreferrer')}
                title="Open source"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-1.5">
        <div className="space-y-2">
          <div>
            <h4 className="font-medium text-xs mb-1">{item.type === 'case' ? 'Summary:' : 'Description:'}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {item.description.length > 300 ? `${item.description.substring(0, 300)}...` : item.description}
            </p>
          </div>

          {item.keywords && item.keywords.length > 0 && (
            <div>
              <h4 className="font-medium text-xs mb-1">Keywords:</h4>
              <div className="flex flex-wrap gap-1">
                {item.keywords.filter(k => !k.toLowerCase().startsWith('ipc ') && !k.toLowerCase().startsWith('crpc ')).slice(0, 7).map((kw, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] h-4 px-1">{kw}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Explanation */}
          {aiExplanation && (
            <div className="bg-primary/5 border border-primary/20 rounded-md p-3 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <h4 className="font-medium text-xs mb-2 flex items-center gap-1.5 text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Juriq Intelligence System:
              </h4>
              <div className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line space-y-1">
                {aiExplanation}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-2 border-t flex gap-2 flex-wrap">
            <Button
              size="sm" variant="outline"
              className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all flex items-center gap-1.5"
              onClick={() => onAiAssist(item)}
              disabled={aiLoading}
            >
              {aiLoading ? <JuriqLoader size="sm" /> : <Brain className="h-3.5 w-3.5 text-primary" />}
              {aiExplanation ? 'Hide Insight' : 'Get AI Insight'}
            </Button>
            {item.sourceLink && (
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all flex items-center gap-1"
                onClick={() => window.open(item.sourceLink, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3 w-3" /> {item.source || 'Source'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const LegalResearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid');
  const [sortBy, setSortBy] = useState('relevance');
  const [activeTab, setActiveTab] = useState<'acts' | 'cases'>('acts');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  // API state
  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiDown, setApiDown] = useState(false);
  const [apiResultsActs, setApiResultsActs] = useState<LegalResult[]>([]);

  const isMounted = useRef(true);
  useEffect(() => {
      return () => { isMounted.current = false; };
  }, []);
  const [apiResultsCases, setApiResultsCases] = useState<LegalResult[]>([]);

  // AI Assist
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});

  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);

  const debouncedQuery = useDebounce(searchQuery, 500);

  // ── Static search (fallback) ────────────────────────────────────────────────
  const staticResults = searchStaticData(debouncedQuery);

  // ── Merge: static results first if keyword mode, else pure API ──────────────
  const mergedActs: LegalResult[] = debouncedQuery
    ? (searchMode !== 'semantic'
      ? [
        ...staticResults.acts,
        ...apiResultsActs.filter(a => !staticResults.acts.some(s => s.title.toLowerCase() === a.title.toLowerCase()))
      ]
      : apiResultsActs
    )
    : [];

  const mergedCases: LegalResult[] = debouncedQuery
    ? (searchMode !== 'semantic'
      ? [
        ...staticResults.cases,
        ...apiResultsCases.filter(c => !staticResults.cases.some(s => s.title.toLowerCase() === c.title.toLowerCase()))
      ]
      : apiResultsCases
    )
    : [];

  // Sort
  const sorted = (arr: LegalResult[]) =>
    sortBy === 'title' ? [...arr].sort((a, b) => a.title.localeCompare(b.title)) : arr;

  const displayedActs = sorted(mergedActs);
  const displayedCases = sorted(mergedCases);
  const currentItems = activeTab === 'acts' ? displayedActs : displayedCases;
  const visibleItems = currentItems.slice(0, visibleCount);

  const totalHits = displayedActs.length + displayedCases.length;

  // ── Auto-select tab with results ────────────────────────────────────────────
  useEffect(() => {
    if (displayedActs.length > 0 && displayedCases.length === 0) setActiveTab('acts');
    else if (displayedCases.length > 0 && displayedActs.length === 0) setActiveTab('cases');
  }, [displayedActs.length, displayedCases.length]);

  // ── Search Logic ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setApiResultsActs([]);
      setApiResultsCases([]);
      return;
    }

    const fetchSearch = async () => {
      setIsApiLoading(true);
      setVisibleCount(20);
      setApiDown(false);

      try {
        let data;
        if (searchMode === 'semantic') {
          data = await semanticSearchLegal(debouncedQuery);
        } else {
          data = await searchLegal(debouncedQuery);
        }
        if (isMounted.current) {
            setApiResultsActs(data.results.acts || []);
            setApiResultsCases(data.results.cases || []);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          if (isMounted.current) setApiDown(true);
        }
      } finally {
        if (isMounted.current) setIsApiLoading(false);
      }
    };

    fetchSearch();
  }, [debouncedQuery, searchMode]);

  // ── AI Assist ───────────────────────────────────────────────────────────────
  const handleAiAssist = useCallback(async (item: LegalResult) => {
    if (aiExplanations[item.id]) {
      setAiExplanations(prev => { const n = { ...prev }; delete n[item.id]; return n; });
      return;
    }

    setAiLoadingId(item.id);
    try {
      // Direct call to the new AI explanation endpoint
      const res = await explainLegal(item);
      setAiExplanations(prev => ({ ...prev, [item.id]: res.explanation }));
    } catch {
      // Local fallback
      const fallback = `**Legal Insight for ${item.title}:**\n\nThis provision under ${item.subtitle} deals with legal requirements concerning ${item.keywords.slice(0, 3).join(', ')}. In practice, it is often cited during ${item.type === 'case' ? 'judicial review' : 'legal filings'} to establish ${item.keywords[0] || 'compliance'}.`;
      setAiExplanations(prev => ({ ...prev, [item.id]: fallback }));
      toast({ title: 'AI Server Busy', description: 'Generated a local legal summary.', variant: 'default' });
    } finally {
      setAiLoadingId(null);
    }
  }, [aiExplanations, toast]);

  const toggleFavorite = (id: string) =>
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Text Copied', description: 'Legal provision saved to clipboard.' });
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Legal Intelligence System</h1>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Scale className="h-4 w-4" /> Context-aware Indian Legal Research & Semantic Analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-6 gap-1 border-primary/20 bg-primary/5 text-primary">
            <Zap className="h-3 w-3" /> Live IndiaCode Data
          </Badge>
          <Badge variant="outline" className="h-6 gap-1 border-accent/20 bg-accent/5 text-accent">
            <Brain className="h-3 w-3" /> Vector Search Active
          </Badge>
        </div>
      </div>

      {/* Search Console */}
      <Card className="shadow-card-custom border-primary/10">
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-3 text-muted-foreground">
                {isApiLoading ? <JuriqLoader size="sm" /> : <Search className="h-5 w-5" />}
              </div>
              <Input
                placeholder="Search by legal concepts, sections, or case names (e.g., 'right to privacy', 'IPC 302', 'Kesavananda')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-sm border-transparent bg-muted/30 focus-visible:ring-primary/20 hover:bg-muted/50 transition-all rounded-xl"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div className="flex p-1 bg-muted/50 rounded-lg border border-border/50">
                <Button
                  variant={searchMode === 'hybrid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] px-3 gap-1.5"
                  onClick={() => setSearchMode('hybrid')}
                >
                  <Zap className="h-3 w-3" /> Hybrid
                </Button>
                <Button
                  variant={searchMode === 'semantic' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] px-3 gap-1.5"
                  onClick={() => setSearchMode('semantic')}
                >
                  <Brain className="h-3 w-3" /> Semantic
                </Button>
                <Button
                  variant={searchMode === 'keyword' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-[11px] px-3 gap-1.5"
                  onClick={() => setSearchMode('keyword')}
                >
                  <Search className="h-3 w-3" /> Keyword
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-[11px] w-[140px] bg-background">
                    <SortAsc className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="title">Alphabetical</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-[11px] gap-1.5">
                  <Filter className="h-3.5 w-3.5" /> Filters
                </Button>
              </div>
            </div>

            {debouncedQuery && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                {isApiLoading
                  ? `AI is crawling statutes and precedents for "${debouncedQuery}"...`
                  : `Analyzed ${totalHits} relevant legal provisions and landmark judgments.`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {apiDown ? (
        <ErrorScreen message="Service temporarily unavailable. Try again later." />
      ) : !debouncedQuery ? (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="md:col-span-2 shadow-sm border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" /> Core Statutes
              </CardTitle>
              <CardDescription className="text-xs">Quick access to primary Indian codes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {['IPC 302', 'CrPC 154', 'Article 21', 'POCSO Act', 'IT Act 66', 'NI Act 138'].map(q => (
                  <Button
                    key={q}
                    variant="outline"
                    className="h-9 text-xs justify-start hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all"
                    onClick={() => setSearchQuery(q)}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-warning" /> Favorites
              </CardTitle>
              <CardDescription className="text-xs">Your bookmarked research</CardDescription>
            </CardHeader>
            <CardContent>
              {favorites.length > 0 ? (
                <div className="space-y-2">
                  {favorites.slice(0, 3).map(id => (
                    <div key={id} className="text-[11px] p-2 border rounded-md bg-muted/30 truncate">
                      {id.replace('s-', '').toUpperCase()}
                    </div>
                  ))}
                  <Button variant="link" className="h-auto p-0 text-[10px]">View all {favorites.length} items</Button>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-xs italic">
                  No bookmarks yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex border-b border-border/50 gap-6">
            <button
              className={`pb-2 text-sm font-medium transition-all relative ${activeTab === 'acts' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('acts')}
            >
              Acts & Sections ({displayedActs.length})
              {activeTab === 'acts' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-left-2" />}
            </button>
            <button
              className={`pb-2 text-sm font-medium transition-all relative ${activeTab === 'cases' ? 'text-primary' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('cases')}
            >
              Landmark Precedents ({displayedCases.length})
              {activeTab === 'cases' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-left-2" />}
            </button>
          </div>

          <div className="space-y-3">
            {visibleItems.length > 0 ? (
              <>
                {visibleItems.map(item => (
                  <ResultCard
                    key={item.id}
                    item={item}
                    isFavorited={favorites.includes(item.id)}
                    onToggleFavorite={toggleFavorite}
                    onCopy={copyToClipboard}
                    onAiAssist={handleAiAssist}
                    aiLoading={aiLoadingId === item.id}
                    aiExplanation={aiExplanations[item.id] || null}
                  />
                ))}
                {visibleCount < currentItems.length && (
                  <div className="text-center py-4">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setVisibleCount(v => v + 20)}>
                      Load more results
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="border-dashed py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold">No results found.</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mt-1">
                    Try different keywords.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalResearch;
