import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { XCircle, RotateCcw, MessageCircle, ArrowRight } from 'lucide-react';

export default function PaymentFailed() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/15 flex items-center justify-center">
            <XCircle className="w-12 h-12 text-destructive" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-destructive">Payment Failed</h1>
          <p className="text-muted-foreground mt-2">
            Your payment could not be processed. No amount has been charged to your account.
          </p>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-sm text-left space-y-2">
          <p className="font-medium text-destructive">Common reasons for failure:</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Insufficient funds in your account</li>
            <li>Card declined by your bank</li>
            <li>Incorrect card details entered</li>
            <li>Card limit exceeded</li>
            <li>Network timeout during payment</li>
          </ul>
        </div>

        <div className="bg-muted rounded-xl p-4 text-sm text-left space-y-1">
          <p className="font-medium">What to do next:</p>
          <p className="text-xs text-muted-foreground">
            Try again with a different card, or contact your bank to authorize the transaction.
            Your subscription remains on the Free plan until payment succeeds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => navigate('/dashboard/pricing')} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Retry Payment
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="gap-2">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Need help?{' '}
          <a href="mailto:support@juriq.app" className="text-primary underline underline-offset-2 inline-flex items-center gap-1">
            <MessageCircle className="w-3 h-3" /> Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
