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
    const sameDayCases: { [date: string]: Case[] } = {};

    cases.forEach(existingCase => {
      if (existingCase.id === currentCase.id) return;

      // Same day conflict check - collect all cases on the same day
      if (existingCase.hearingDate && currentCase.hearingDate) {
        const existingDate = new Date(existingCase.hearingDate);
        const currentDate = new Date(currentCase.hearingDate);
        
        if (existingDate.toDateString() === currentDate.toDateString()) {
          const dateKey = existingDate.toDateString();
          if (!sameDayCases[dateKey]) {
            sameDayCases[dateKey] = [];
          }
          sameDayCases[dateKey].push(existingCase);

          // Time conflict check (more than 2 hours apart but same day)
          const timeDiff = Math.abs(
            new Date(`2000-01-01 ${existingCase.hearingTime || '10:00'}`).getTime() - 
            new Date(`2000-01-01 ${currentCase.hearingTime || '10:00'}`).getTime()
          );
          
          if (timeDiff < 2 * 60 * 60 * 1000) { // Less than 2 hours apart
            foundConflicts.push({
              type: 'time',
              severity: timeDiff < 60 * 60 * 1000 ? 'high' : 'medium',
              message: `Time conflict with ${existingCase.caseNumber} on ${existingDate.toLocaleDateString('en-IN')}`,
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

      // Court conflict check (same court, same date)
      if (existingCase.courtName.toLowerCase() === currentCase.courtName.toLowerCase() &&
          existingCase.hearingDate && currentCase.hearingDate) {
        const existingDate = new Date(existingCase.hearingDate);
        const currentDate = new Date(currentCase.hearingDate);
        
        if (existingDate.toDateString() === currentDate.toDateString()) {
          foundConflicts.push({
            type: 'court',
            severity: 'low',
            message: `Multiple cases at ${currentCase.courtName} on ${currentDate.toLocaleDateString('en-IN')}`,
            affectedCase: existingCase,
            date: existingDate.toDateString()
          });
        }
      }
    });

    // Add same-day conflicts for dates with multiple cases
    Object.entries(sameDayCases).forEach(([dateKey, casesOnDate]) => {
      // Only show conflicts if there are already multiple cases on the same day
      // (This means existing cases on that date >= 2, not just 1)
      if (casesOnDate.length >= 1) {
        // Check if there are already multiple cases on this date (excluding current case)
        const totalCasesOnDate = cases.filter(c => {
          if (c.id === currentCase.id) return false;
          if (!c.hearingDate) return false;
          return new Date(c.hearingDate).toDateString() === dateKey;
        }).length;
        
        // Only show conflict if there are already 2 or more cases on this date
        if (totalCasesOnDate >= 2) {
          const date = new Date(dateKey);
          casesOnDate.forEach(caseOnDate => {
            foundConflicts.push({
              type: 'same-day',
              severity: 'medium',
              message: `Multiple cases already scheduled on ${date.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}`,
              affectedCase: caseOnDate,
              date: dateKey
            });
          });
        }
      }
    });

    return foundConflicts;
  }, [cases, currentCase]);

  const getConflictIcon = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium': return <Clock className="h-4 w-4 text-warning" />;
      case 'low': return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Conflict Checker
          </CardTitle>
          <CardDescription>AI-powered conflict detection system</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Enter case details to check for potential conflicts
          </p>
          {cases.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">Test Conflict Detection:</p>
              <p className="text-xs text-blue-700 mb-2">
                Create a case with the same date as an existing case to see conflicts:
              </p>
              <div className="space-y-1">
                {cases.slice(0, 3).map(c => (
                  <p key={c.id} className="text-xs text-blue-600">
                    • {c.caseNumber} - {c.clientName} on {c.hearingDate ? new Date(c.hearingDate).toLocaleDateString() : 'No date'}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card-custom">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {conflicts.length > 0 ? (
            <AlertTriangle className="h-5 w-5 text-warning" />
          ) : (
            <CheckCircle className="h-5 w-5 text-success" />
          )}
          Conflict Checker
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {conflicts.length > 0 
            ? 'Potential conflicts detected for this case'
            : 'No conflicts detected for this case'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {conflicts.length > 0 ? (
          <div className="space-y-4">
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
                      <div key={dateKey} className="space-y-2">
                        <h4 className="text-sm font-semibold text-primary border-b pb-1">
                          {date.toLocaleDateString('en-IN', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h4>
                        <div className="space-y-2 ml-2">
                          {dateConflicts.map((conflict, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                              {getConflictIcon(conflict.severity)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-medium">{conflict.message}</p>
                                  <Badge variant={getConflictColor(conflict.severity)}>
                                    {conflict.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
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
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-primary border-b pb-1">
                        General Conflicts
                      </h4>
                      <div className="space-y-2 ml-2">
                        {conflictsWithoutDate.map((conflict, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                            {getConflictIcon(conflict.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium">{conflict.message}</p>
                                <Badge variant={getConflictColor(conflict.severity)}>
                                  {conflict.severity}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
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
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 mx-auto text-success mb-2" />
            <p className="text-sm font-medium">All Clear!</p>
            <p className="text-xs text-muted-foreground">
              No scheduling conflicts or ethical concerns detected
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};