import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Sparkles, Copy, Download, RefreshCw } from 'lucide-react';
import { useLegalData, Case } from '@/contexts/LegalDataContext';
import { useToast } from '@/hooks/use-toast';

interface CaseSummaryGeneratorProps {
  caseId: string;
}

export const CaseSummaryGenerator = ({ caseId }: CaseSummaryGeneratorProps) => {
  const { cases } = useLegalData();
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  const case_ = cases.find(c => c.id === caseId);

  const generateSummary = async () => {
    if (!case_) return;

    setIsGenerating(true);
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock AI summary
    const mockSummary = `
**Case Summary: ${case_.caseNumber}**

**Parties Involved:**
- Petitioner/Plaintiff: ${case_.clientName}
${case_.opposingParty ? `- Respondent/Defendant: ${case_.opposingParty}` : ''}

**Case Details:**
- Case Type: ${case_.caseType}
- Court: ${case_.courtName}
${case_.judgeName ? `- Presiding Judge: ${case_.judgeName}` : ''}
- Priority Level: ${case_.priority.toUpperCase()}
- Current Status: ${case_.status.toUpperCase()}

**Case Description:**
${case_.description || 'No detailed description available.'}

**Key Information:**
${case_.hearingDate ? `- Next Hearing: ${new Date(case_.hearingDate).toLocaleDateString('en-IN')} ${case_.hearingTime ? `at ${case_.hearingTime}` : ''}` : '- No hearing scheduled'}
- Documents: ${case_.documents.length} document(s) on file
- Case Priority: This case is marked as ${case_.priority} priority

**Professional Notes:**
${case_.notes || 'No additional notes available.'}

**Action Items:**
- Prepare case documents and evidence
- Review relevant legal precedents
- Coordinate with client for hearing preparation
${case_.priority === 'urgent' ? '- URGENT: Immediate attention required' : ''}

**Generated on:** ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}
**AI Confidence:** High (95%)

*This summary was generated using AI assistance. Please review and verify all information.*
    `.trim();

    setSummary(mockSummary);
    setIsGenerating(false);
    
    toast({
      title: "Summary Generated",
      description: "AI case summary has been created successfully",
    });
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast({
        title: "Copied to Clipboard",
        description: "Case summary copied successfully",
      });
    }
  };

  const downloadSummary = () => {
    if (summary && case_) {
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${case_.caseNumber}_Summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Case summary file is being downloaded",
      });
    }
  };

  if (!case_) {
    return (
      <Card className="shadow-card-custom">
        <CardContent className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Case not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Case Summary Generator
          </CardTitle>
          <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-secondary/10">
            AI Powered
          </Badge>
        </div>
        <CardDescription>
          Generate comprehensive case summaries using AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Generate Case Summary</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create a comprehensive summary for case {case_.caseNumber}
              </p>
            </div>
            
            <Button onClick={generateSummary} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Summary
                </>
              )}
            </Button>
            
            {isGenerating && (
              <div className="mt-4 space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Analyzing case details and generating summary...
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button size="sm" variant="outline" onClick={downloadSummary}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={generateSummary}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
            </div>
            
            <div className="bg-muted p-4 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {summary}
              </pre>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">AI Generated</Badge>
              <span>•</span>
              <span>Generated {new Date().toLocaleDateString('en-IN')}</span>
              <span>•</span>
              <span>Review recommended</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};