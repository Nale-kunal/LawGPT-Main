// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\components\TemplateCard.tsx

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight } from "lucide-react";
import { LegalTemplate } from "../templates";

interface TemplateCardProps {
  template: LegalTemplate;
  onUse: (id: string) => void;
}

export const TemplateCard = ({ template, onUse }: TemplateCardProps) => {
  return (
    <Card className="shadow-card-custom border border-transparent hover:border-accent hover:border-2 hover:bg-transparent transition-all duration-300 group flex flex-col h-full cursor-pointer">
      <CardHeader className="pb-1.5 p-3">
        <div className="flex justify-between items-start mb-1.5">
          <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-normal">
            {template.category}
          </Badge>
        </div>
        <CardTitle className="text-xs font-bold group-hover:text-primary transition-colors leading-tight">
          {template.name}
        </CardTitle>
        <CardDescription className="text-[10px] line-clamp-1 mt-0.5">
          Professional {template.name}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2 px-3 pt-0">
        <p className="text-[10px] text-muted-foreground italic leading-tight">
          Standard Indian legal practice template.
        </p>
      </CardContent>
      
      <CardFooter className="pt-1 p-3">
        <Button 
          onClick={(e) => {
            e.stopPropagation();
            onUse(template.id);
          }} 
          size="sm"
          variant="outline"
          className="w-full h-7 text-[10px] border-transparent hover:border-accent hover:border-2 hover:bg-transparent transition-all"
        >
          <span>Use Template</span>
          <ArrowRight className="ml-1.5 h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};
