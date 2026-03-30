// f:\LAWGPT\LawGPT\frontend\src\modules\legalTemplates\components\TemplateCard.tsx

import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, ArrowRight, Scale, Gavel, Briefcase, Home, Users, FolderOpen } from "lucide-react";
import { LegalTemplate } from "../templates";

interface TemplateCardProps {
  template: LegalTemplate;
  onUse: (id: string) => void;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  Civil:     <Scale className="h-4 w-4 text-blue-500" />,
  Criminal:  <Gavel className="h-4 w-4 text-red-500" />,
  Corporate: <Briefcase className="h-4 w-4 text-green-500" />,
  Property:  <Home className="h-4 w-4 text-orange-500" />,
  Family:    <Users className="h-4 w-4 text-purple-500" />,
  Court:     <Scale className="h-4 w-4 text-sky-500" />,
  General:   <FolderOpen className="h-4 w-4 text-gray-500" />,
  Misc:      <FolderOpen className="h-4 w-4 text-gray-500" />,
};

export const TemplateCard = ({ template, onUse }: TemplateCardProps) => {
  const icon = CATEGORY_ICON[template.category] ?? <FileText className="h-4 w-4 text-primary" />;

  return (
    <Card className="shadow-card-custom border border-transparent hover:border-accent hover:border-2 hover:bg-transparent transition-all duration-300 group flex flex-col h-full cursor-pointer">
      <CardHeader className="pb-1.5 p-3">
        <div className="flex justify-between items-start mb-1.5">
          <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
            {icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-[8px] h-3.5 px-1 font-normal">
              {template.category}
            </Badge>
            {template.version && (
              <Badge variant="outline" className="text-[7px] h-3 px-1 font-normal opacity-60">
                {template.version}
              </Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-xs font-bold group-hover:text-primary transition-colors leading-tight">
          {template.name}
        </CardTitle>
        <CardDescription className="text-[10px] line-clamp-1 mt-0.5">
          {template.jurisdiction ? `${template.jurisdiction} — ` : ""}Professional {template.category} Template
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-2 px-3 pt-0">
        <p className="text-[10px] text-muted-foreground italic leading-tight">
          {template.fields.length} fields · Indian legal practice standard
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
