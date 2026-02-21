import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useLegalData, Case } from '@/contexts/LegalDataContext';

interface ConflictCheckerProps {
  currentCase?: Case;
}

interface Conflict {
  type: 'time' | 'client' | 'court' | 'opposing-party' | 'same-day';
  severity: 'high' | 'medium' | 'low';
  message: string;
  affectedCase: Case;
  date?: string;
}

export const CaseConflictChecker = ({ currentCase }: ConflictCheckerProps) => {
  const { cases } = useLegalData();

  const conflicts = useMemo(() => {
    if (!currentCase) return [];

    const foundConflicts: Conflict[] = [];

    cases.forEach(existingCase => {
      if (existingCase.id === currentCase.id) return;

      // Same day conflict check
      if (existingCase.hearingDate && currentCase.hearingDate) {
        const existingDate = new Date(existingCase.hearingDate);
        const currentDate = new Date(currentCase.hearingDate);

        if (existingDate.toDateString() === currentDate.toDateString()) {
          const dateKey = existingDate.toDateString();

          // Time conflict check (less than 3 hours apart but same day)
          const timeDiff = Math.abs(
            new Date(`2000-01-01 ${existingCase.hearingTime || '10:00'}`).getTime() -
            new Date(`2000-01-01 ${currentCase.hearingTime || '10:00'}`).getTime()
          );

          if (timeDiff < 3 * 60 * 60 * 1000) { // Less than 3 hours apart
            foundConflicts.push({
              type: 'time',
              severity: timeDiff < 60 * 60 * 1000 ? 'high' : 'medium',
              message: `Scheduling conflict with ${existingCase.caseNumber} on ${existingDate.toLocaleDateString('en-IN')}`,
              affectedCase: existingCase,
              date: dateKey
            });
          }
        }
      }

      // Client conflict check
      if (existingCase.clientName.toLowerCase() === currentCase.clientName.toLowerCase() &&
        existingCase.status === 'active' && currentCase.status === 'active') {
        foundConflicts.push({
          type: 'client',
          severity: 'medium',
          message: `Multiple active cases for client: ${currentCase.clientName}`,
          affectedCase: existingCase
        });
      }

      // Opposing party conflict check
      if (existingCase.opposingParty && currentCase.opposingParty &&
        existingCase.opposingParty.toLowerCase() === currentCase.opposingParty.toLowerCase()) {
        foundConflicts.push({
          type: 'opposing-party',
          severity: 'high',
          message: `Conflict of interest: Same opposing party (${currentCase.opposingParty})`,
          affectedCase: existingCase
        });
      }
    });

    return foundConflicts;
  }, [cases, currentCase]);

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

  if (!currentCase) {
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
            Enter case details to check for potential conflicts
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
          {conflicts.length > 0
            ? 'Potential conflicts detected for this case'
            : 'No conflicts detected for this case'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {conflicts.length > 0 ? (
          <div className="space-y-2">
            {(() => {
              // Group conflicts by date
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
                  {/* Conflicts grouped by date */}
                  {Object.entries(conflictsByDate).map(([dateKey, dateConflicts]) => {
                    const date = new Date(dateKey);
                    return (
                      <div key={dateKey} className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-primary border-b pb-0.5">
                          {date.toLocaleDateString('en-IN', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
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
                                  Conflicting case: {conflict.affectedCase.caseNumber} - {conflict.affectedCase.clientName}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Conflicts without specific dates */}
                  {conflictsWithoutDate.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-primary border-b pb-0.5">
                        General Conflicts
                      </h4>
                      <div className="space-y-1.5 ml-1.5">
                        {conflictsWithoutDate.map((conflict, index) => (
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
                                Conflicting case: {conflict.affectedCase.caseNumber} - {conflict.affectedCase.clientName}
                              </p>
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