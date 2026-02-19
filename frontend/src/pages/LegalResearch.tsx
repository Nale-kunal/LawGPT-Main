import { useState } from 'react';
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
  SortAsc
} from 'lucide-react';
import { useLegalData, LegalSection } from '@/contexts/LegalDataContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const LegalResearch = () => {
  const { legalSections, searchLegalSections } = useLegalData();
  const [searchQuery, setSearchQuery] = useState('');
  const [actFilter, setActFilter] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  // Get search results
  const searchResults = searchLegalSections(searchQuery);

  // Filter by act
  const filteredResults = actFilter === 'all'
    ? searchResults
    : searchResults.filter(section => section.actName.toLowerCase().includes(actFilter.toLowerCase()));

  // Sort results
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'section':
        return a.sectionNumber.localeCompare(b.sectionNumber, undefined, { numeric: true });
      case 'title':
        return a.title.localeCompare(b.title);
      case 'act':
        return a.actName.localeCompare(b.actName);
      default:
        return 0; // Keep original order for relevance
    }
  });

  // Get unique acts for filter
  const uniqueActs = Array.from(new Set(legalSections.map(section => section.actName)));

  const toggleFavorite = (sectionId: string) => {
    setFavorites(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Legal section copied successfully",
    });
  };

  const getSectionIcon = (actName: string) => {
    if (actName.includes('Indian Penal Code')) return <Gavel className="h-4 w-4 text-destructive" />;
    if (actName.includes('Criminal Procedure')) return <FileText className="h-4 w-4 text-warning" />;
    if (actName.includes('Contract')) return <Scale className="h-4 w-4 text-primary" />;
    return <BookOpen className="h-4 w-4 text-muted-foreground" />;
  };

  const getActBadgeColor = (actName: string) => {
    if (actName.includes('Indian Penal Code')) return 'destructive';
    if (actName.includes('Criminal Procedure')) return 'secondary';
    if (actName.includes('Contract')) return 'default';
    return 'outline';
  };

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Legal Research</h1>
          <p className="text-xs text-muted-foreground">Indian Law Dictionary & Legal References</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card-custom">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-3.5 w-3.5 text-primary" />
            Legal Research Tool
          </CardTitle>
          <CardDescription className="text-[10px]">
            Search through Indian legal sections, acts, and regulations
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="space-y-2">
            {/* Main Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by section number, keywords, or description (e.g., 'IPC 302', 'murder', 'contract')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-36">
                <Select value={actFilter} onValueChange={setActFilter}>
                  <SelectTrigger className="h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all">
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Filter by Act" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Acts</SelectItem>
                    {uniqueActs.map(act => (
                      <SelectItem key={act} value={act}>{act}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-36">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all">
                    <SortAsc className="mr-2 h-3.5 w-3.5" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="section">Section Number</SelectItem>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="act">Act Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Stats */}
            <div className="text-[10px] text-muted-foreground">
              {searchQuery ? (
                `Found ${sortedResults.length} result${sortedResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
              ) : (
                `${legalSections.length} legal sections available for search`
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access */}
      {!searchQuery && (
        <Card className="shadow-card-custom">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Popular Sections</CardTitle>
            <CardDescription className="text-[10px]">Frequently referenced legal provisions</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { query: 'IPC 302', label: 'Murder (IPC 302)' },
                { query: 'IPC 420', label: 'Cheating (IPC 420)' },
                { query: 'CrPC 154', label: 'FIR (CrPC 154)' },
                { query: 'Contract 10', label: 'Valid Contract' },
              ].map(item => (
                <Button
                  key={item.query}
                  variant="outline"
                  className="h-7 text-xs px-2 border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                  onClick={() => setSearchQuery(item.query)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-2 md:space-y-3">
        {sortedResults.map((section) => (
          <Card key={section.id} className="shadow-card-custom hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-1.5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getSectionIcon(section.actName)}
                    <CardTitle className="text-sm">
                      Section {section.sectionNumber}: {section.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(section.id)}
                      className={`h-6 w-6 p-0 ${favorites.includes(section.id) ? 'text-warning' : ''}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${favorites.includes(section.id) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getActBadgeColor(section.actName)} className="text-[10px] h-4 px-1">
                      {section.actName}
                    </Badge>
                    {section.punishment !== 'N/A - Civil Law' && section.punishment !== 'N/A - Procedural' && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {section.punishment}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(`Section ${section.sectionNumber} - ${section.title}\n\n${section.description}\n\nPunishment: ${section.punishment}\n\nAct: ${section.actName}`)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-1.5">
              <div className="space-y-2">
                <div>
                  <h4 className="font-medium text-xs mb-1">Description:</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </div>

                {section.punishment && section.punishment !== 'N/A - Civil Law' && section.punishment !== 'N/A - Procedural' && (
                  <div>
                    <h4 className="font-medium text-xs mb-1">Punishment:</h4>
                    <p className="text-xs text-destructive">
                      {section.punishment}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-xs mb-1">Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {section.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-[10px] h-4 px-1">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Related Sections */}
                <div className="pt-2 border-t">
                  <h4 className="font-medium text-xs mb-1">Quick Actions:</h4>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                      onClick={() => setSearchQuery(section.keywords[0] || '')}
                    >
                      Find Related
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                      onClick={() => copyToClipboard(section.sectionNumber)}
                    >
                      Copy Section
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* No Results */}
        {searchQuery && sortedResults.length === 0 && (
          <Card>
            <CardContent className="text-center py-6">
              <BookOpen className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-sm font-semibold mb-1">No matching sections found</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Try searching with different keywords or section numbers.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all" onClick={() => setSearchQuery('murder')}>
                  Try "murder"
                </Button>
                <Button variant="outline" className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all" onClick={() => setSearchQuery('contract')}>
                  Try "contract"
                </Button>
                <Button variant="outline" className="h-7 text-xs border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all" onClick={() => setSearchQuery('IPC')}>
                  Try "IPC"
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Default View */}
        {!searchQuery && (
          <Card>
            <CardContent className="text-center py-6">
              <Scale className="h-8 w-8 mx-auto text-primary mb-2" />
              <h3 className="text-sm font-semibold mb-1">Legal Research Tool</h3>
              <p className="text-xs text-muted-foreground mb-2">
                Start searching for legal sections, acts, and regulations.
              </p>
              <div className="max-w-md mx-auto space-y-1 text-xs text-muted-foreground">
                <p>• Search by section number: "IPC 302", "CrPC 154"</p>
                <p>• Search by keywords: "murder", "theft", "contract"</p>
                <p>• Search by act name: "Indian Penal Code"</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <Card className="shadow-card-custom">
          <CardHeader className="pb-1">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Star className="h-3.5 w-3.5 text-warning fill-current" />
              Favorite Sections ({favorites.length})
            </CardTitle>
            <CardDescription className="text-[10px]">Your bookmarked legal provisions</CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {favorites.map(fav => {
                const section = legalSections.find(s => s.id === fav);
                if (!section) return null;

                return (
                  <div key={fav} className="p-2 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-xs">Section {section.sectionNumber}</p>
                      <p className="text-[10px] text-muted-foreground">{section.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setSearchQuery(section.sectionNumber)}
                    >
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LegalResearch;