// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\pages\TemplatesDashboard.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import JuriqLoader from "@/components/ui/JuriqLoader";
import {
  RefreshCw, LayoutGrid, Clock, FileText, Trash2, Search,
  Scale, Gavel, Briefcase, Home, Users, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { TemplateCard } from "../components/TemplateCard";
import { ALL_TEMPLATES } from "../templates";

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Civil:     { icon: <Scale className="h-3.5 w-3.5" />,   color: "text-blue-500" },
  Criminal:  { icon: <Gavel className="h-3.5 w-3.5" />,   color: "text-red-500" },
  Corporate: { icon: <Briefcase className="h-3.5 w-3.5" />, color: "text-green-500" },
  Property:  { icon: <Home className="h-3.5 w-3.5" />,    color: "text-orange-500" },
  Family:    { icon: <Users className="h-3.5 w-3.5" />,   color: "text-purple-500" },
  Court:     { icon: <Scale className="h-3.5 w-3.5" />,   color: "text-sky-500" },
  General:   { icon: <FolderOpen className="h-3.5 w-3.5" />, color: "text-gray-500" },
  Misc:      { icon: <FolderOpen className="h-3.5 w-3.5" />, color: "text-gray-500" },
};

const ALL_CATEGORIES = Array.from(new Set(ALL_TEMPLATES.map((t) => t.category)));

const TemplatesDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrafts = async () => {
      try {
        const response = await api.get<any[]>("/api/v1/templates");
        setDrafts(response);
      } catch (error) {
        console.error("Failed to fetch drafts", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, []);

  const filteredTemplates = ALL_TEMPLATES.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (id: string) => navigate(`/dashboard/templates/new?templateId=${id}`);
  const handleOpenDraft = (id: string) => navigate(`/dashboard/templates/${id}`);

  const handleDeleteDraft = async (id: string) => {
    setDeletingId(id);
    try {
      await api.delete(`/api/v1/templates/${id}`);
      setDrafts((prev) => prev.filter((d) => d._id !== id));
      toast({ title: "Draft Deleted", description: "The template draft has been removed." });
    } catch (error) {
      console.error("Failed to delete draft", error);
      toast({ title: "Error", description: "Failed to delete the draft. Please try again.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // Stat counts
  const civilCount     = ALL_TEMPLATES.filter((t) => t.category === "Civil").length;
  const criminalCount  = ALL_TEMPLATES.filter((t) => t.category === "Criminal").length;
  const corporateCount = ALL_TEMPLATES.filter((t) => t.category === "Corporate").length;
  const propertyCount  = ALL_TEMPLATES.filter((t) => t.category === "Property").length;

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Legal Templates</h1>
          <p className="text-xs text-muted-foreground">
            {ALL_TEMPLATES.length} professional, court-ready templates for Indian legal practice.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all"
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <Card className="shadow-card-custom cursor-pointer hover:border-primary transition-all" onClick={() => setActiveCategory("all")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Total Library</CardTitle>
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{ALL_TEMPLATES.length}</div>
            <p className="text-[10px] text-muted-foreground">All categories</p>
          </CardContent>
        </Card>

        <Card className="shadow-card-custom cursor-pointer hover:border-primary transition-all" onClick={() => setActiveCategory("Civil")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Civil</CardTitle>
            <Scale className="h-3.5 w-3.5 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{civilCount}</div>
            <p className="text-[10px] text-muted-foreground">Civil templates</p>
          </CardContent>
        </Card>

        <Card className="shadow-card-custom cursor-pointer hover:border-primary transition-all" onClick={() => setActiveCategory("Criminal")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Criminal</CardTitle>
            <Gavel className="h-3.5 w-3.5 text-red-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{criminalCount}</div>
            <p className="text-[10px] text-muted-foreground">Criminal templates</p>
          </CardContent>
        </Card>

        <Card className="shadow-card-custom cursor-pointer hover:border-primary transition-all" onClick={() => setActiveCategory("Corporate")}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Corporate</CardTitle>
            <Briefcase className="h-3.5 w-3.5 text-green-500" />
          </CardHeader>
          <CardContent className="pt-1">
            <div className="text-xl font-bold">{corporateCount}</div>
            <p className="text-[10px] text-muted-foreground">Corporate templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Category Filters */}
      <Card className="shadow-card-custom">
        <CardHeader className="pb-1">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4 text-primary" />
            Search & Filter Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-1 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search templates (e.g., 'Bail', 'NDA', 'Divorce')..."
              className="pl-8 h-8 text-xs border-transparent hover:border-accent hover:border-2 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant={activeCategory === "all" ? "default" : "outline"}
              className="h-6 text-[10px] px-2 rounded-full"
              onClick={() => setActiveCategory("all")}
            >
              All ({ALL_TEMPLATES.length})
            </Button>
            {ALL_CATEGORIES.map((cat) => {
              const cfg = CATEGORY_CONFIG[cat];
              const count = ALL_TEMPLATES.filter((t) => t.category === cat).length;
              return (
                <Button
                  key={cat}
                  size="sm"
                  variant={activeCategory === cat ? "default" : "outline"}
                  className="h-6 text-[10px] px-2 rounded-full flex items-center gap-1"
                  onClick={() => setActiveCategory(cat)}
                >
                  {cfg?.icon}
                  {cat} ({count})
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs — Library | Drafts */}
      <Tabs defaultValue="all" className="w-full">
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <TabsList>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span>Template Library</span>
              {activeCategory !== "all" && (
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1 ml-1">{activeCategory}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>My Drafts ({drafts.length})</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Template Library Grid */}
        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {filteredTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} onUse={handleUseTemplate} />
            ))}
            {filteredTemplates.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No templates found for "{searchQuery || activeCategory}"</p>
                <Button variant="link" size="sm" className="mt-2" onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Drafts */}
        <TabsContent value="drafts" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
            {drafts.map((draft) => (
              <Card
                key={draft._id}
                className="hover:border-primary transition-all cursor-pointer group relative"
                onClick={() => handleOpenDraft(draft._id)}
              >
                <CardHeader className="pb-2 p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xs font-bold truncate leading-tight">{draft.templateName}</CardTitle>
                      <CardDescription className="text-[10px] mt-1">
                        Last updated: {new Date(draft.updatedAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant={draft.status === "completed" ? "default" : "secondary"}
                        className="text-[8px] h-3.5 px-1"
                      >
                        {draft.status}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            disabled={deletingId === draft._id}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove "{draft.templateName}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft._id); }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <p className="text-[10px] line-clamp-2 text-muted-foreground overflow-hidden h-8">
                    {draft.finalHTML.replace(/<[^>]*>?/gm, "").substring(0, 100)}...
                  </p>
                </CardContent>
              </Card>
            ))}
            {drafts.length === 0 && !loading && (
              <div className="col-span-full py-20 text-center bg-muted/30 rounded-lg border-2 border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground font-medium">No saved drafts yet.</p>
                <p className="text-sm text-muted-foreground italic mt-1">
                  Start by picking a template from the "Template Library" tab.
                </p>
              </div>
            )}
            {loading && (
              <div className="col-span-full py-20 text-center">
                <JuriqLoader size="md" />
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-auto py-4 border-t text-center text-xs text-muted-foreground">
        ⚖️ Jurisdiction: India &nbsp;|&nbsp; All templates are drafts only. Review by a qualified advocate before use.
      </div>
    </div>
  );
};

export default TemplatesDashboard;
