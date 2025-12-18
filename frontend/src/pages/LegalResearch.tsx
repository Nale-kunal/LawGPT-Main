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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Legal Research</h1>
          <p className="text-muted-foreground">Indian Law Dictionary & Legal References</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card-custom">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Legal Research Tool
          </CardTitle>
          <CardDescription>
            Search through Indian legal sections, acts, and regulations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by section number, keywords, or description (e.g., 'IPC 302', 'murder', 'contract')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-48">
                <Select value={actFilter} onValueChange={setActFilter}>
                  <SelectTrigger>
                    <Filter className="mr-2 h-4 w-4" />
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
              
              <div className="flex-1 min-w-48">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SortAsc className="mr-2 h-4 w-4" />
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
            <div className="text-sm text-muted-foreground">
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
          <CardHeader>
            <CardTitle>Popular Sections</CardTitle>
            <CardDescription>Frequently referenced legal provisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { query: 'IPC 302', label: 'Murder (IPC 302)' },
                { query: 'IPC 420', label: 'Cheating (IPC 420)' },
                { query: 'CrPC 154', label: 'FIR (CrPC 154)' },
                { query: 'Contract 10', label: 'Valid Contract' },
              ].map(item => (
                <Button 
                  key={item.query}
                  variant="outline" 
                  className="h-auto p-3 flex flex-col gap-1"
                  onClick={() => setSearchQuery(item.query)}
                >
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      <div className="space-y-4">
        {sortedResults.map((section) => (
          <Card key={section.id} className="shadow-card-custom hover:shadow-elevated transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getSectionIcon(section.actName)}
                    <CardTitle className="text-lg">
                      Section {section.sectionNumber}: {section.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(section.id)}
                      className={favorites.includes(section.id) ? 'text-warning' : ''}
                    >
                      <Star className={`h-4 w-4 ${favorites.includes(section.id) ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={getActBadgeColor(section.actName)}>
                      {section.actName}
                    </Badge>
                    {section.punishment !== 'N/A - Civil Law' && section.punishment !== 'N/A - Procedural' && (
                      <Badge variant="outline" className="text-xs">
                        {section.punishment}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`Section ${section.sectionNumber} - ${section.title}\n\n${section.description}\n\nPunishment: ${section.punishment}\n\nAct: ${section.actName}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Description:</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </div>

                {section.punishment && section.punishment !== 'N/A - Civil Law' && section.punishment !== 'N/A - Procedural' && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Punishment:</h4>
                    <p className="text-sm text-destructive">
                      {section.punishment}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-2">Keywords:</h4>
                  <div className="flex flex-wrap gap-1">
                    {section.keywords.map((keyword, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Related Sections */}
                <div className="pt-3 border-t">
                  <h4 className="font-medium text-sm mb-2">Quick Actions:</h4>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setSearchQuery(section.keywords[0] || '')}
                    >
                      Find Related
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
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
            <CardContent className="text-center py-12">
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No matching sections found</h3>
              <p className="text-muted-foreground mb-4">
                Try searching with different keywords or section numbers.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={() => setSearchQuery('murder')}>
                  Try "murder"
                </Button>
                <Button variant="outline" onClick={() => setSearchQuery('contract')}>
                  Try "contract"
                </Button>
                <Button variant="outline" onClick={() => setSearchQuery('IPC')}>
                  Try "IPC"
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Default View */}
        {!searchQuery && (
          <Card>
            <CardContent className="text-center py-12">
              <Scale className="h-16 w-16 mx-auto text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Legal Research Tool</h3>
              <p className="text-muted-foreground mb-4">
                Start searching for legal sections, acts, and regulations.
              </p>
              <div className="max-w-md mx-auto space-y-2 text-sm text-muted-foreground">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-warning fill-current" />
              Favorite Sections ({favorites.length})
            </CardTitle>
            <CardDescription>Your bookmarked legal provisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {favorites.map(fav => {
                const section = legalSections.find(s => s.id === fav);
                if (!section) return null;
                
                return (
                  <div key={fav} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Section {section.sectionNumber}</p>
                      <p className="text-xs text-muted-foreground">{section.title}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
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