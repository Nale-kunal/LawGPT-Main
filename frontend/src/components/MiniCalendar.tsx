import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  FileText,
} from 'lucide-react';
import { useLegalData, type Case } from '@/contexts/LegalDataContext';
import { cn, parseTimeToMinutes } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useFormatting } from '@/contexts/FormattingContext';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getPriorityColor = (priority: Case['priority']) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500 text-white';
    case 'high':   return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low':    return 'bg-green-500 text-white';
    default:       return 'bg-gray-500 text-white';
  }
};

const MiniCalendar = () => {
  const { cases, hearings } = useLegalData();
  const navigate = useNavigate();
  const { formatDate } = useFormatting();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const currentMonth = currentDate.getMonth();
  const currentYear  = currentDate.getFullYear();
  const today        = new Date();

  // ── Calendar grid ───────────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const firstDay      = new Date(currentYear, currentMonth, 1);
    const lastDay       = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth   = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const days: (number | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [currentYear, currentMonth]);

  // ── Events for a date (mirrors Calendar.tsx getCasesForDate) ───────────────
  const getEventsForDate = useCallback((date: Date) => {
    const casesForDate = cases.filter(c => {
      const eventDate = c.nextHearing || c.hearingDate;
      if (!eventDate) return false;
      return new Date(eventDate).toDateString() === date.toDateString();
    });

    const hearingsForDate = hearings.filter(h => {
      const eventDate = h.nextHearingDate || h.hearingDate;
      if (!eventDate) return false;
      return new Date(eventDate).toDateString() === date.toDateString();
    });

    return [
      ...casesForDate.map(c => ({ ...c, isHearing: false, eventType: 'case' })),
      ...hearingsForDate.map(h => {
        const caseData =
          (h as { populatedCase?: any }).populatedCase || // eslint-disable-line @typescript-eslint/no-explicit-any
          (h.caseId && typeof h.caseId === 'object' ? (h.caseId as any) : null); // eslint-disable-line @typescript-eslint/no-explicit-any
        return {
          ...h,
          isHearing: true,
          eventType: 'next_hearing',
          caseNumber:  caseData?.caseNumber || `Case ${h.caseId}`,
          clientName:  caseData?.clientName  || 'Client Name Not Found',
          courtName:   h.courtName,
          judgeName:   h.judgeName,
          hearingTime: h.nextHearingTime || h.hearingTime,
          hearingDate: h.nextHearingDate || h.hearingDate,
          description: h.purpose || h.courtInstructions || 'Next hearing scheduled',
        };
      }),
    ];
  }, [cases, hearings]);

  // ── Conflict detection (same logic as Calendar.tsx) ─────────────────────────
  const getConflictsForDate = useCallback((date: Date) => {
    const events = getEventsForDate(date);
    const conflicts: string[] = [];
    events.forEach((e1, i) => {
      const c1 = e1 as { caseNumber: string; hearingTime: string };
      events.slice(i + 1).forEach(e2 => {
        const c2 = e2 as { caseNumber: string; hearingTime: string };
        const diff = Math.abs(
          parseTimeToMinutes(c1.hearingTime || '10:00') -
          parseTimeToMinutes(c2.hearingTime || '10:00')
        );
        if (diff < 3 * 60) conflicts.push(`${c1.caseNumber} & ${c2.caseNumber}`);
      });
    });
    return conflicts;
  }, [getEventsForDate]);

  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === currentMonth &&
    today.getFullYear() === currentYear;

  const selectedDateEvents = useMemo(
    () => (selectedDate ? getEventsForDate(selectedDate) : []),
    [selectedDate, getEventsForDate],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3">

      {/* ── Calendar grid (lg:col-span-2) ─────────────────────────────────── */}
      <Card className="lg:col-span-2 shadow-elevated">
        <CardHeader className="pb-1.5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {monthNames[currentMonth]} {currentYear}
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
                className="border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
                className="border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <CardDescription className="text-[10px]">
            Click on a date to view scheduled hearings
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-1.5">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map(d => (
              <div key={d} className="p-1 text-center text-[10px] font-medium text-muted-foreground">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div
            key={`mini-cal-${currentYear}-${currentMonth}`}
            className="grid grid-cols-7 gap-1"
          >
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="p-1.5 h-12" />;
              }

              const date          = new Date(currentYear, currentMonth, day);
              const events        = getEventsForDate(date);
              const conflicts     = getConflictsForDate(date);
              const isSelected    = selectedDate?.toDateString() === date.toDateString();
              const todayFlag     = isToday(day);

              return (
                <div
                  key={`day-${currentYear}-${currentMonth}-${day}`}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'p-1.5 h-12 border rounded-lg cursor-pointer transition-colors hover:bg-muted relative overflow-hidden',
                    todayFlag && 'bg-blue-500/10 border-blue-600 border-2',
                    isSelected && !todayFlag && 'border-accent border-2',
                    isSelected && todayFlag && 'bg-blue-500/10 border-blue-600 border-2',
                    !todayFlag && events.length > 0 && !isSelected && 'border-primary',
                    conflicts.length > 0 && !todayFlag && 'bg-destructive/5',
                  )}
                >
                  {/* Day number row */}
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-medium leading-none">{day}</div>
                    {todayFlag && (
                      <span className="text-[8px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded leading-none">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Event dots row */}
                  {events.length > 0 && (
                    <div className="flex items-center gap-0.5 mt-1 flex-nowrap">
                      {events.slice(0, 2).map((ev, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            (ev as any).isHearing // eslint-disable-line @typescript-eslint/no-explicit-any
                              ? 'bg-blue-500'
                              : (ev as any).priority === 'urgent' ? 'bg-red-500' // eslint-disable-line @typescript-eslint/no-explicit-any
                              : (ev as any).priority === 'high'   ? 'bg-orange-500' // eslint-disable-line @typescript-eslint/no-explicit-any
                              : (ev as any).priority === 'medium' ? 'bg-yellow-500' // eslint-disable-line @typescript-eslint/no-explicit-any
                              : 'bg-green-500',
                          )}
                          title={
                            (ev as any).isHearing // eslint-disable-line @typescript-eslint/no-explicit-any
                              ? 'Next Hearing'
                              : `${(ev as any).priority || 'medium'} priority case` // eslint-disable-line @typescript-eslint/no-explicit-any
                          }
                        />
                      ))}
                      {events.length > 2 && (
                        <span className="text-[8px] text-muted-foreground leading-none flex-shrink-0">
                          +{events.length - 2}
                        </span>
                      )}
                      {conflicts.length > 0 && (
                        <span
                          className="text-[8px] text-destructive leading-none ml-auto flex-shrink-0"
                          title="Schedule conflict"
                        >
                          ⚠
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Selected date detail panel ──────────────────────────────────────── */}
      <Card className="shadow-elevated">
        <CardHeader className="pb-1.5">
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            {selectedDate
              ? formatDate(selectedDate, { includeTime: false })
              : 'Select a Date'}
          </CardTitle>
          <CardDescription className="text-[10px]">
            {selectedDate
              ? selectedDateEvents.length > 0
                ? `${selectedDateEvents.length} hearing${selectedDateEvents.length > 1 ? 's' : ''} scheduled`
                : 'No hearings scheduled'
              : 'Click on a date to view hearings'}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-1.5">
          {selectedDateEvents.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
              {selectedDateEvents.map((event, index) => (
                <div
                  key={(event as any).id || index} // eslint-disable-line @typescript-eslint/no-explicit-any
                  className="p-2 border rounded-lg space-y-1"
                >
                  {/* Event header */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[11px]">
                      {(event as any).isHearing // eslint-disable-line @typescript-eslint/no-explicit-any
                        ? `Next Hearing – ${event.caseNumber}`
                        : event.caseNumber}
                    </h4>
                    {(event as any).isHearing ? ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <Badge
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/20 text-[9px] h-4 px-1"
                      >
                        Next Hearing
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`${getPriorityColor((event as Case).priority || 'medium')} text-[9px] h-4 px-1`}
                      >
                        {(event as Case).priority || 'medium'}
                      </Badge>
                    )}
                  </div>

                  {/* Event meta */}
                  <div className="space-y-0.5 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <User className="h-2.5 w-2.5 flex-shrink-0" />
                      <span>{event.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                      <span>{event.courtName || '—'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                      <span>{event.hearingTime || 'Time not specified'}</span>
                    </div>
                    {event.judgeName && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>{event.judgeName}</span>
                      </div>
                    )}
                    {(event as any).isHearing && ( // eslint-disable-line @typescript-eslint/no-explicit-any
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="h-2.5 w-2.5 flex-shrink-0" />
                        <span>Scheduled Next Hearing</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {event.description && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  {/* Action button */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                      onClick={() => navigate('/dashboard/calendar')}
                    >
                      View in Calendar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : selectedDate ? (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-1.5 opacity-50" />
              <p className="text-xs">No hearings scheduled for this date</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-1.5 h-6 text-[10px] border-transparent hover:border-accent hover:border-2 hover:bg-transparent hover:text-foreground transition-all"
                onClick={() => navigate('/dashboard/calendar')}
              >
                Open Calendar
              </Button>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-1.5 opacity-50" />
              <p className="text-xs">Select a date to view hearings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MiniCalendar;
