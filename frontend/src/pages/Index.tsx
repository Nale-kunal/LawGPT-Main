import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Scale, FileText, Users, Calendar, BookOpen } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen legal-gradient">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-12">
          <Scale className="h-16 w-16 mx-auto mb-6" />
          <h1 className="text-5xl font-bold mb-4">LegalPro</h1>
          <p className="text-xl mb-8">Professional Legal Case Management for Indian Law Firms</p>
          <Button size="lg" onClick={() => navigate('/login', { replace: false })} className="bg-white text-primary hover:bg-white/90">
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          {[
            { icon: FileText, title: 'Case Management', desc: 'Track all your legal cases efficiently' },
            { icon: Users, title: 'Client Portal', desc: 'Manage client relationships and data' },
            { icon: Calendar, title: 'Court Calendar', desc: 'Never miss a hearing or deadline' },
            { icon: BookOpen, title: 'Legal Research', desc: 'Indian law dictionary and references' }
          ].map((feature, index) => (
            <Card key={index} className="bg-white/10 border-white/20 text-white">
              <CardHeader className="text-center">
                <feature.icon className="h-12 w-12 mx-auto mb-4" />
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">{feature.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
