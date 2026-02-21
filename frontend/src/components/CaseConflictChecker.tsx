import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useLegalData, Case } from '@/contexts/LegalDataContext';
import { parseTimeToMinutes } from '@/lib/utils';

interface ConflictCheckerProps {
  currentCase?: Case;
  selectedDate?: Date;
}

interface Conflict {
  type: 'time' | 'client' | 'court' | 'opposing-party' | 'same-day';
  severity: 'high' | 'medium' | 'low';
  message: string;
  affectedCase: Case;
  otherCase?: Case;
  date?: string;
}

export const CaseConflictChecker = ({ currentCase, selectedDate }: ConflictCheckerProps) => {
  const { cases, hearings } = useLegalData();

  const conflicts = useMemo(() => {
    const foundConflicts: Conflict[] = [];

    // Combine cases and hearings for comprehensive check
    const allEvents = [
      ...cases.map(c => ({
        id: c.id,
        caseNumber: c.caseNumber,
        clientName: c.clientName,
        opposingParty: c.opposingParty,
        // Preference: nextHearing, fallback to hearingDate
        eventDate: c.nextHearing || c.hearingDate,
        eventTime: c.hearingTime,
        status: c.status,
        eventType: 'case'
      })),
      ...hearings.map(h => {
        const caseData = (h as any).populatedCase || (h.caseId && typeof h.caseId === 'object' ? h.caseId : null);
        return {
          id: h.id,
          caseNumber: caseData?.caseNumber || `Case ${h.caseId}`,
          clientName: caseData?.clientName || 'Unknown',
          opposingParty: (h as any).opposingParty || '',
          eventDate: h.nextHearingDate || h.hearingDate,
          eventTime: h.nextHearingTime || h.hearingTime,
          status: 'active' as const,
          eventType: 'hearing'
        };
      })
    ];

    if (currentCase) {
      // MODE 1: Check conflicts FOR A SPECIFIC CASE (Editing/Adding mode)
      allEvents.forEach(event => {
        if (event.id === currentCase.id) return;

        // Same day conflict check
        if (event.eventDate && currentCase.hearingDate) {
          const eDate = new Date(event.eventDate);
          const cDate = new Date(currentCase.hearingDate);

          if (eDate.toDateString() === cDate.toDateString()) {
            const time1 = parseTimeToMinutes(event.eventTime || '10:00');
            const time2 = parseTimeToMinutes(currentCase.hearingTime || '10:00');
            const timeDiff = Math.abs(time1 - time2);

            if (timeDiff < 3 * 60) { // Less than 3 hours apart
              foundConflicts.push({
                type: 'time',
                severity: timeDiff < 60 ? 'high' : 'medium',
                message: `Scheduling conflict with ${event.caseNumber} on ${eDate.toLocaleDateString('en-IN')}`,
                affectedCase: event as any,
                date: eDate.toDateString()
              });
            }
          }
        }

        // Client conflict check
        if (event.clientName?.toLowerCase() === currentCase.clientName?.toLowerCase() &&
          event.status === 'active' && currentCase.status === 'active') {
          foundConflicts.push({
            type: 'client',
            severity: 'medium',
            message: `Multiple active cases for client: ${currentCase.clientName}`,
            affectedCase: event as any
          });
        }

        // Opposing party conflict check
        if (event.opposingParty && currentCase.opposingParty &&
          event.opposingParty.toLowerCase() === currentCase.opposingParty.toLowerCase()) {
          foundConflicts.push({
            type: 'opposing-party',
            severity: 'high',
            message: `Conflict of interest: Same opposing party (${currentCase.opposingParty})`,
            affectedCase: event as any
          });
        }
      });
    } else if (selectedDate) {
      // MODE 2: Check ALL conflicts for a selected date (Daily View mode)
      const dateStr = selectedDate.toDateString();
      const dayEvents = allEvents.filter(e => e.eventDate && new Date(e.eventDate).toDateString() === dateStr);

      console.log(`[CaseConflictChecker] Mode=Daily Date=${dateStr} EventsSelected=${dayEvents.length}`);

      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const e1 = dayEvents[i];
          const e2 = dayEvents[j];

          const time1 = parseTimeToMinutes(e1.eventTime || '10:00');
          const time2 = parseTimeToMinutes(e2.eventTime || '10:00');
          const timeDiff = Math.abs(time1 - time2);

          if (timeDiff < 3 * 60) {
            foundConflicts.push({
              type: 'time',
              severity: timeDiff < 60 ? 'high' : 'medium',
              message: `Scheduling conflict: ${e1.caseNumber} & ${e2.caseNumber}`,
              affectedCase: e1 as any,
              otherCase: e2 as any,
              date: dateStr
            });
          }
        }
      }
    }

    return foundConflicts;
  }, [cases, hearings, currentCase, selectedDate]);

  const getConflictIcon = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case 'medium': return <Clock className="h-3.5 w-3.5 text-warning" />;
      case 'low': return <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getConflictColor = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
    }
  };

  if (!currentCase && !selectedDate) {
    return (
      <Card className="shadow-card-custom">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <CheckCircle className="h-3.5 w-3.5 text-success" />
            Conflict Checker
          </CardTitle>
          <CardDescription className="text-[10px]">AI-powered conflict detection system</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs text-muted-foreground">
            Select a date or enter case details to check for conflicts
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card-custom">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          {conflicts.length > 0 ? (
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 text-success" />
          )}
          Conflict Checker
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="ml-1.5 text-[10px] h-4 px-1">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-[10px]">
          {selectedDate && !currentCase
            ? `Checking all schedules for ${selectedDate.toLocaleDateString('en-IN')}`
            : conflicts.length > 0
              ? 'Potential conflicts detected for this case'
              : 'No conflicts detected for this case'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {conflicts.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              // Group conflicts by date (relevant if checked over multiple days, though here usually 1)
              const conflictsByDate: { [date: string]: Conflict[] } = {};
              const conflictsWithoutDate: Conflict[] = [];

              conflicts.forEach(conflict => {
                if (conflict.date) {
                  if (!conflictsByDate[conflict.date]) {
                    conflictsByDate[conflict.date] = [];
                  }
                  conflictsByDate[conflict.date].push(conflict);
                } else {
                  conflictsWithoutDate.push(conflict);
                }
              });

              return (
                <>
                  {Object.entries(conflictsByDate).map(([dateKey, dateConflicts]) => (
                    <div key={dateKey} className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-primary border-b pb-0.5">
                        {new Date(dateKey).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </h4>
                      <div className="space-y-1.5 ml-1.5">
                        {dateConflicts.map((conflict, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 border rounded-lg">
                            {getConflictIcon(conflict.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-xs font-medium">{conflict.message}</p>
                                <Badge variant={getConflictColor(conflict.severity)} className="text-[10px] h-4 px-1">
                                  {conflict.severity}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {conflict.otherCase
                                  ? `${conflict.affectedCase.caseNumber} vs ${conflict.otherCase.caseNumber}`
                                  : `Conflicting with: ${conflict.affectedCase.caseNumber}`
                                }
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {conflictsWithoutDate.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-primary border-b pb-0.5">General Conflicts</h4>
                      <div className="space-y-1.5 ml-1.5">
                        {conflictsWithoutDate.map((conflict, index) => (
                          <div key={index} className="flex items-start gap-2 p-2 border rounded-lg">
                            {getConflictIcon(conflict.severity)}
                            <div className="flex-1">
                              <p className="text-xs font-medium">{conflict.message}</p>
                              <Badge variant={getConflictColor(conflict.severity)} className="text-[10px] h-4 px-1">{conflict.severity}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="text-center py-4">
            <CheckCircle className="h-8 w-8 mx-auto text-success mb-1.5" />
            <p className="text-xs font-medium">All Clear!</p>
            <p className="text-[10px] text-muted-foreground">
              No scheduling conflicts or ethical concerns detected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};