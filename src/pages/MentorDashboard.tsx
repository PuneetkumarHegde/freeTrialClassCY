import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  LogOut,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  User,
  GraduationCap,
  Sparkles,
  Loader2,
  AlertCircle,
  ExternalLink,
  Mail,
  Target,
  Globe,
  ChevronRight,
  ShieldCheck,
  X,
  BookOpen,
} from 'lucide-react';
import {
  fetchMentorProfile,
  fetchMentorSchedule,
  fetchMentorAppointments,
  completeAppointment,
  addMentorUnavailability,
  MentorProfile,
  MentorScheduleResponse,
  MentorAppointment,
  MentorDailyCapacity,
} from '../api/mentor';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MentorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [dailyCapacity, setDailyCapacity] = useState<MentorDailyCapacity>({
    totalLimit: 2,
    todayCount: 0,
    remainingSlots: 2,
    isLimitReached: false,
  });
  const [appointments, setAppointments] = useState<MentorAppointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [scheduleData, setScheduleData] = useState<MentorScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<MentorAppointment | null>(null);

  // Tab: 'overview' | 'availability' | 'unavailability'
  const [activeTab, setActiveTab] = useState<'overview' | 'availability' | 'unavailability'>('overview');

  // Unavailability Request State
  const [isUnavailabilityModalOpen, setIsUnavailabilityModalOpen] = useState(false);
  const [reqDate, setReqDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    return tomorrow.toISOString().split('T')[0];
  });
  const [reqStartTime, setReqStartTime] = useState('14:00');
  const [reqEndTime, setReqEndTime] = useState('18:00');
  const [reqReason, setReqReason] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [unavailError, setUnavailError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [profData, appData, schedData] = await Promise.all([
        fetchMentorProfile(),
        fetchMentorAppointments(),
        fetchMentorSchedule(selectedDate),
      ]);

      setProfile(profData);
      setDailyCapacity(appData.dailyCapacity);
      setAppointments(appData.appointments);
      setScheduleData(schedData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching mentor data';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    setIsLoadingSchedule(true);
    try {
      const sched = await fetchMentorSchedule(newDate);
      setScheduleData(sched);
    } catch (err) {
      console.error('Failed to load schedule for date:', err);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleCreateUnavailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnavailError(null);

    const startIso = new Date(`${reqDate}T${reqStartTime}:00.000Z`).toISOString();
    const endIso = new Date(`${reqDate}T${reqEndTime}:00.000Z`).toISOString();

    const startTimestamp = new Date(startIso).getTime();
    const now = Date.now();
    const minAdvanceMs = 24 * 60 * 60 * 1000;

    if (startTimestamp - now < minAdvanceMs) {
      setUnavailError('Request must be submitted at least 24 hours before the requested start time.');
      return;
    }

    if (new Date(endIso).getTime() <= startTimestamp) {
      setUnavailError('End time must be strictly after start time.');
      return;
    }

    setIsSubmittingReq(true);
    try {
      await addMentorUnavailability({
        startDate: startIso,
        endDate: endIso,
        reason: reqReason.trim() || undefined,
      });
      setIsUnavailabilityModalOpen(false);
      setReqReason('');
      await loadData();
    } catch (err: unknown) {
      setUnavailError(err instanceof Error ? err.message : 'Failed to submit unavailability request.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleCompleteClass = async (id: string, notes?: string) => {
    setCompletingId(id);
    try {
      await completeAppointment(id, notes);
      // Reload appointments and schedule
      await loadData();
      if (selectedAppointment && selectedAppointment.appointmentId === id) {
        setSelectedAppointment((prev) => (prev ? { ...prev, status: 'COMPLETED' } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark appointment completed');
    } finally {
      setCompletingId(null);
    }
  };

  const formatLocalTime = (isoString: string, tz: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const formatLocalDate = (isoString: string, tz: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        timeZone: tz,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#172033] flex flex-col font-sans selection:bg-[#172033] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#E5E7EB] shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#172033] flex items-center justify-center text-white shadow-xs">
                <Code2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-[#172033] font-serif">
                  Codeyoung
                </span>
                <span className="block text-[10px] uppercase tracking-wider text-[#64748B] font-semibold -mt-1">
                  Mentor Operations Portal
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-[#F1F5F9] px-3 py-1.5 rounded-lg text-xs text-[#334155]">
              <Globe className="w-3.5 h-3.5 text-[#4F6B8A]" />
              <span>
                Mentor Timezone:{' '}
                <strong className="font-mono text-[#172033]">{profile?.timezone || user?.timezone || 'Asia/Kolkata'}</strong>
              </span>
            </div>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-rose-700 bg-white hover:bg-rose-50 border border-[#E5E7EB] px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Welcome & Capacity Header */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#4F6B8A] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Certified STEM Faculty</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[#172033] font-serif">
              Welcome back, {profile?.fullName || user?.fullName || 'Mentor'}
            </h2>
            <p className="text-xs text-[#64748B]">
              Logged in as <span className="font-mono text-[#334155]">{user?.email}</span>
            </p>
          </div>

          {/* Daily Class Limit Pill */}
          <div className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#172033] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {dailyCapacity.todayCount} / {dailyCapacity.totalLimit}
            </div>
            <div>
              <span className="block text-xs font-bold text-[#172033]">
                Today&apos;s Trial Classes ({dailyCapacity.todayCount} / {dailyCapacity.totalLimit})
              </span>
              <span className="text-xs font-medium text-[#64748B]">
                {dailyCapacity.isLimitReached
                  ? 'Daily limit reached (Max 2 classes/day)'
                  : `${dailyCapacity.remainingSlots} slot${dailyCapacity.remainingSlots === 1 ? '' : 's'} remaining today`}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Overview & Scheduled Classes
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'availability'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Date-wise Availability
          </button>
          <button
            onClick={() => setActiveTab('unavailability')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'unavailability'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>Unavailability Requests</span>
            {profile?.unavailabilities && profile.unavailabilities.length > 0 && (
              <span className="bg-slate-200 text-slate-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {profile.unavailabilities.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-[#E5E7EB]">
            <Loader2 className="w-8 h-8 text-[#172033] animate-spin" />
            <span className="text-xs font-medium text-[#64748B]">Loading mentor dashboard data...</span>
          </div>
        ) : errorMessage ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Scheduled Classes List (8 cols) */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#334155] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#4F6B8A]" />
                      <span>Assigned Trial Classes ({appointments.length})</span>
                    </h3>
                  </div>

                  {appointments.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-semibold text-[#172033]">No Trial Classes Assigned Yet</p>
                      <p className="text-xs text-[#64748B]">
                        When parents book trial classes matching your availability, they will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointments.map((app) => {
                        const mentorTz = profile?.timezone || 'Asia/Kolkata';
                        const isConfirmed = app.status === 'CONFIRMED';
                        const isCompleted = app.status === 'COMPLETED';

                        return (
                          <div
                            key={app.appointmentId}
                            className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs hover:border-[#4F6B8A] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                            onClick={() => setSelectedAppointment(app)}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#4F6B8A] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                                  {app.bookingId}
                                </span>
                                <span
                                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    isCompleted
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : isConfirmed
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                                  }`}
                                >
                                  {app.status}
                                </span>
                              </div>

                              <h4 className="text-base font-bold text-[#172033]">
                                {app.studentName}{' '}
                                <span className="text-xs font-normal text-[#64748B]">
                                  (Grade {app.studentGrade})
                                </span>
                              </h4>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B]">
                                <span className="font-semibold text-[#334155]">{app.subject}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3.5 h-3.5 text-[#4F6B8A]" />
                                  {formatLocalDate(app.startTime, mentorTz)} ·{' '}
                                  {formatLocalTime(app.startTime, mentorTz)} –{' '}
                                  {formatLocalTime(app.endTime, mentorTz)}
                                </span>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-2 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Link
                                to={`/class/${app.appointmentId}`}
                                className="inline-flex items-center gap-1.5 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs active:scale-98"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Class</span>
                              </Link>

                              {isConfirmed && (
                                <button
                                  type="button"
                                  disabled={completingId === app.appointmentId}
                                  onClick={() => handleCompleteClass(app.appointmentId)}
                                  className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-2xs active:scale-98"
                                >
                                  {completingId === app.appointmentId ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>Complete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Profile & Regular Availability Rules (4 cols) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#334155] flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#4F6B8A]" />
                      <span>Weekly Working Hours</span>
                    </h3>

                    <p className="text-xs text-[#64748B]">
                      Regular recurring availability configured in your mentor profile (
                      {profile?.timezone || 'Asia/Kolkata'}).
                    </p>

                    <div className="space-y-2 pt-2">
                      {profile?.availability && profile.availability.length > 0 ? (
                        profile.availability.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-[#F1F5F9]"
                          >
                            <span className="font-semibold text-[#172033]">{DAYS[rule.dayOfWeek]}</span>
                            <span className="font-mono text-[#4F6B8A]">
                              {rule.localStart} – {rule.localEnd}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400">No availability rules defined.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DATE-WISE AVAILABILITY TAB */}
            {activeTab === 'availability' && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                  <div>
                    <h3 className="text-base font-bold text-[#172033] font-serif">
                      Date-Wise Availability Schedule
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Schedule timeline evaluated in your mentor timezone ({profile?.timezone || 'Asia/Kolkata'}).
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label htmlFor="mentor-date-picker" className="text-xs font-bold text-[#334155]">
                      Select Date:
                    </label>
                    <input
                      id="mentor-date-picker"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#172033]"
                    />
                  </div>
                </div>

                {isLoadingSchedule ? (
                  <div className="p-8 flex items-center justify-center gap-2 text-xs text-[#64748B]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#172033]" />
                    <span>Evaluating schedule slots...</span>
                  </div>
                ) : scheduleData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs bg-[#F8FAFC] p-3 rounded-xl">
                      <span className="font-semibold text-[#334155]">
                        Date: <strong className="text-[#172033]">{scheduleData.date}</strong>
                      </span>
                      <span className="font-semibold text-[#4F6B8A]">
                        Capacity: {scheduleData.dailyCapacity.todayCount} / {scheduleData.dailyCapacity.totalLimit} classes scheduled
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {scheduleData.timeSlots.length === 0 ? (
                        <div className="col-span-full py-8 text-center text-xs text-[#64748B]">
                          No active working hours configured for this day of the week.
                        </div>
                      ) : (
                        scheduleData.timeSlots.map((slot, idx) => {
                          const isAvailable = slot.status === 'AVAILABLE';
                          const isScheduled = slot.status === 'SCHEDULED';

                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl border transition-all ${
                                isScheduled
                                  ? 'bg-blue-50/60 border-blue-200 text-blue-950'
                                  : isAvailable
                                  ? 'bg-emerald-50/40 border-emerald-200 text-emerald-950'
                                  : 'bg-slate-50 border-slate-200 text-slate-500'
                              }`}
                            >
                              <div className="flex items-center justify-between font-mono text-xs font-bold">
                                <span>
                                  {slot.localStart} – {slot.localEnd}
                                </span>
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                    isScheduled
                                      ? 'bg-blue-600 text-white'
                                      : isAvailable
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-300 text-slate-700'
                                  }`}
                                >
                                  {slot.status === 'AVAILABLE'
                                    ? 'Available'
                                    : slot.status === 'SCHEDULED'
                                    ? 'Scheduled'
                                    : 'Limit Reached'}
                                </span>
                              </div>

                              {slot.appointment && (
                                <div className="mt-2.5 pt-2 border-t border-blue-200/80 text-xs space-y-1">
                                  <p className="font-bold text-[#172033]">{slot.appointment.studentName}</p>
                                  <p className="text-[11px] text-[#4F6B8A]">{slot.appointment.subject}</p>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* UNAVAILABILITY REQUESTS TAB */}
            {activeTab === 'unavailability' && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                  <div>
                    <h3 className="text-base font-bold text-[#172033] font-serif">
                      Mentor Unavailability Requests
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      Submit time off or exception periods. Requests must be submitted at least 24 hours in advance and require Admin approval.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUnavailError(null);
                      setIsUnavailabilityModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-98 cursor-pointer"
                  >
                    <span>+ Request Unavailability</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {!profile?.unavailabilities || profile.unavailabilities.length === 0 ? (
                    <div className="py-12 text-center text-xs text-[#64748B] bg-[#FAFAF8] rounded-xl border border-[#E5E7EB]">
                      No unavailability requests submitted. Click &quot;Request Unavailability&quot; above to block future dates.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                          <tr>
                            <th className="p-3.5">Requested Date & Time</th>
                            <th className="p-3.5">Reason</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5">Scheduling Impact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                          {profile.unavailabilities.map((u) => {
                            const tz = profile?.timezone || 'Asia/Kolkata';
                            const status = u.status || 'PENDING';
                            const isApproved = status === 'APPROVED';
                            const isPending = status === 'PENDING';

                            return (
                              <tr key={u.id} className="hover:bg-[#FAFAF8] transition-colors">
                                <td className="p-3.5 font-mono font-semibold text-[#172033]">
                                  {formatLocalDate(u.startDate, tz)} · {formatLocalTime(u.startDate, tz)} – {formatLocalTime(u.endDate, tz)}
                                </td>
                                <td className="p-3.5 text-[#334155]">
                                  {u.reason || 'Personal time off'}
                                </td>
                                <td className="p-3.5">
                                  <span
                                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                      isApproved
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : isPending
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </td>
                                <td className="p-3.5 text-[#64748B] text-[11px]">
                                  {isApproved
                                    ? '● Active (Blocks trial bookings)'
                                    : isPending
                                    ? '○ Pending admin review (Does not block bookings)'
                                    : '✕ Rejected by admin'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Unavailability Request Modal */}
      {isUnavailabilityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#172033] font-serif">
                  Request Unavailability
                </h3>
                <p className="text-xs text-[#64748B]">
                  Submit at least 24 hours before the requested start time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnavailabilityModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {unavailError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{unavailError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUnavailability} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#334155] block">Date</label>
                <input
                  type="date"
                  required
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-[#334155] block">Start Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={reqStartTime}
                    onChange={(e) => setReqStartTime(e.target.value)}
                    className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-[#334155] block">End Time (24h)</label>
                  <input
                    type="time"
                    required
                    value={reqEndTime}
                    onChange={(e) => setReqEndTime(e.target.value)}
                    className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#334155] block">Reason</label>
                <textarea
                  rows={2}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="e.g. Doctor appointment / University exam"
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUnavailabilityModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReq}
                  className="inline-flex items-center gap-2 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50"
                >
                  {isSubmittingReq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Request (Pending Admin Approval)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#4F6B8A] bg-[#F1F5F9] px-2.5 py-1 rounded-md">
                  {selectedAppointment.bookingId}
                </span>
                <h3 className="text-xl font-bold text-[#172033] font-serif mt-2">
                  Trial Class Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#FAFAF8] p-4 rounded-2xl border border-[#E5E7EB]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#64748B] block">Student:</span>
                  <strong className="text-sm text-[#172033]">{selectedAppointment.studentName}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Grade:</span>
                  <strong className="text-sm text-[#172033]">{selectedAppointment.studentGrade}</strong>
                </div>
              </div>

              <div>
                <span className="text-[#64748B] block">Subject:</span>
                <strong className="text-sm text-[#172033]">{selectedAppointment.subject}</strong>
              </div>

              {selectedAppointment.learningGoal && (
                <div>
                  <span className="text-[#64748B] block">Learning Goal:</span>
                  <p className="text-slate-700 italic mt-0.5">{selectedAppointment.learningGoal}</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#64748B] block">Parent Contact:</span>
                <span className="text-[#172033] font-semibold">{selectedAppointment.parentName}</span>
                {selectedAppointment.parentEmail && (
                  <span className="text-[#64748B] block text-[11px]">{selectedAppointment.parentEmail}</span>
                )}
              </div>

              <div className="pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#64748B] block">Time in Mentor Timezone:</span>
                <span className="text-[#172033] font-mono font-semibold">
                  {formatLocalDate(selectedAppointment.startTime, profile?.timezone || 'Asia/Kolkata')} ·{' '}
                  {formatLocalTime(selectedAppointment.startTime, profile?.timezone || 'Asia/Kolkata')} –{' '}
                  {formatLocalTime(selectedAppointment.endTime, profile?.timezone || 'Asia/Kolkata')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                to={`/class/${selectedAppointment.appointmentId}`}
                className="inline-flex items-center gap-2 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-2xs active:scale-98"
              >
                <Video className="w-4 h-4" />
                <span>Join Classroom</span>
              </Link>

              {selectedAppointment.status === 'CONFIRMED' && (
                <button
                  type="button"
                  disabled={completingId === selectedAppointment.appointmentId}
                  onClick={() => handleCompleteClass(selectedAppointment.appointmentId)}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-2xs active:scale-98"
                >
                  {completingId === selectedAppointment.appointmentId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Mark Completed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
