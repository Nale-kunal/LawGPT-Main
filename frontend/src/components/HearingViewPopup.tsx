import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  Building,
  Gavel,
  FileText,
  Users,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  MapPin,
  User,
  FileCheck
} from 'lucide-react';
import { Case, Hearing } from '@/contexts/LegalDataContext';

interface HearingViewPopupProps {
  case_: Case | null;
  hearing: Hearing | null;
  isOpen: boolean;
  onClose: () => void;
}

export const HearingViewPopup: React.FC<HearingViewPopupProps> = ({
  case_,
  hearing,
  isOpen,
  onClose
}) => {
  // Helper function to safely parse and validate dates
  const safeParseDate = (date: any): Date | undefined => {
    if (!date) return undefined;

    // Already a valid Date object
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }

    // Try to parse as string or number
    const parsed = new Date(date);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    return undefined;
  };

  // Create safe hearing object with validated dates
  const safeHearing: Hearing | null = hearing ? {
    ...hearing,
    hearingDate: safeParseDate(hearing.hearingDate) || new Date(),
    hearingTime: hearing.hearingTime || undefined,
    hearingType: hearing.hearingType || 'other',
    status: hearing.status || 'scheduled',
    documentsToBring: hearing.documentsToBring || [],
    attendance: {
      clientPresent: hearing.attendance?.clientPresent ?? false,
      opposingPartyPresent: hearing.attendance?.opposingPartyPresent ?? false,
      witnessesPresent: hearing.attendance?.witnessesPresent || [],
    },
    orders: (hearing.orders || []).map(order => ({
      ...order,
      orderDate: safeParseDate(order.orderDate) || new Date()
    })),
    nextHearingDate: safeParseDate(hearing.nextHearingDate),
  } : null;

  const getHearingStatusColor = (status: Hearing['status']) => {
    switch (status) {
      case 'scheduled': return 'default';
      case 'completed': return 'outline';
      case 'adjourned': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'default';
    }
  };

  const formatDate = (date?: Date | string) => {
    if (!date) return '—';

    // Use the safe parser
    const parsed = safeParseDate(date);
    if (!parsed) return '—';

    try {
      return parsed.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return '—';
    }
  };

  const formatTime = (time?: string) => {
    return time || '—';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Hearing Details
          </DialogTitle>
        </DialogHeader>


        {!safeHearing ? (
          <div className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Hearing Details</h3>
            <p className="text-muted-foreground mb-4">
              The hearing data could not be loaded. Please try again.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Date:</span>
                      <span>{formatDate(safeHearing.hearingDate)}</span>
                    </div>

                    {safeHearing.hearingTime && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Time:</span>
                        <span>{formatTime(safeHearing.hearingTime)}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Court:</span>
                      <span>{safeHearing.courtName}</span>
                    </div>

                    {safeHearing.judgeName && (
                      <div className="flex items-center gap-2">
                        <Gavel className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Judge:</span>
                        <span>{safeHearing.judgeName}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Type:</span>
                      <Badge variant="outline">{safeHearing.hearingType.replace('_', ' ').toUpperCase()}</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge variant={getHearingStatusColor(safeHearing.status)}>
                        {safeHearing.status.toUpperCase()}
                      </Badge>
                    </div>

                    {safeHearing.nextHearingDate && (
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Next Hearing:</span>
                        <span>
                          {formatDate(safeHearing.nextHearingDate)}
                          {safeHearing.nextHearingTime && ` at ${formatTime(safeHearing.nextHearingTime)}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purpose and Instructions */}
            {(safeHearing.purpose || safeHearing.courtInstructions) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    Purpose & Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {safeHearing.purpose && (
                    <div>
                      <h4 className="font-medium mb-2">Purpose:</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {safeHearing.purpose}
                      </p>
                    </div>
                  )}

                  {safeHearing.courtInstructions && (
                    <div>
                      <h4 className="font-medium mb-2">Court Instructions:</h4>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {safeHearing.courtInstructions}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Documents and Witnesses */}
            {(safeHearing.documentsToBring?.length > 0 || safeHearing.attendance?.witnessesPresent?.length > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents & Witnesses
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {safeHearing.documentsToBring?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Documents to Bring:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {safeHearing.documentsToBring.map((doc, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {doc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {safeHearing.attendance?.witnessesPresent?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Witnesses Present:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {safeHearing.attendance.witnessesPresent.map((witness, index) => (
                          <li key={index} className="text-sm text-muted-foreground">
                            {witness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client Present:</span>
                    <Badge variant={safeHearing.attendance?.clientPresent ? 'outline' : 'secondary'}>
                      {safeHearing.attendance?.clientPresent ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Opposing Party Present:</span>
                    <Badge variant={safeHearing.attendance?.opposingPartyPresent ? 'outline' : 'secondary'}>
                      {safeHearing.attendance?.opposingPartyPresent ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders */}
            {safeHearing.orders?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="h-4 w-4" />
                    Court Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safeHearing.orders.map((order, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{order.orderType}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(order.orderDate)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.orderDetails}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proceedings */}
            {safeHearing.proceedings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Proceedings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {safeHearing.proceedings}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Adjournment Reason */}
            {safeHearing.adjournmentReason && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Adjournment Reason
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {safeHearing.adjournmentReason}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {safeHearing.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Additional Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {safeHearing.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end pt-4">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
