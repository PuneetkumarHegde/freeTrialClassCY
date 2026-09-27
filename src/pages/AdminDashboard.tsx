import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  LogOut,
  Calendar,
  Clock,
  Video,
  User,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Plus,
  RefreshCw,
  Mail,
  Bell,
  Check,
  ChevronRight,
  Filter,
  X,
  FileText,
  Search,
  ExternalLink,
  Ban,
  CheckCheck,
} from 'lucide-react';
import {
  fetchAdminDashboard,
  fetchAdminMentors,
  createAdminMentor,
  terminateAdminMentor,
  reactivateAdminMentor,
  approveAdminMentorUnavailability,
  rejectAdminMentorUnavailability,
  fetchAdminMentorDashboard,
  fetchAdminAppointments,
  fetchCompletedTrials,
  fetchEmailLogs,
  fetchNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  cancelAdminAppointment,
  AdminDashboardSummary,
  AdminMentorItem,
  AdminAppointmentItem,
  CompletedTrialItem,
  EmailLogItem,
  NotificationItem,
} from '../api/admin';

type AdminTab = 'overview' | 'mentors' | 'bookings' | 'completed' | 'emails' | 'notifications';

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Summary state
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  // Mentors state
  const [mentors, setMentors] = useState<AdminMentorItem[]>([]);
  const [isAddMentorOpen, setIsAddMentorOpen] = useState(false);
  const [newMentorName, setNewMentorName] = useState('');
  const [newMentorEmail, setNewMentorEmail] = useState('');
  const [newMentorPassword, setNewMentorPassword] = useState('Mentor@1234');
  const [newMentorTimezone, setNewMentorTimezone] = useState('Asia/Kolkata');
  const [isCreatingMentor, setIsCreatingMentor] = useState(false);

  // Inspector state for /admin/mentors/:mentorId
  const [inspectingMentorId, setInspectingMentorId] = useState<string | null>(null);
  const [inspectedMentorData, setInspectedMentorData] = useState<any | null>(null);
  const [isLoadingInspector, setIsLoadingInspector] = useState(false);

  // Bookings state
  const [appointments, setAppointments] = useState<AdminAppointmentItem[]>([]);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('');
  const [bookingSortOrder, setBookingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedBooking, setSelectedBooking] = useState<AdminAppointmentItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bookingToCancel, setBookingToCancel] = useState<AdminAppointmentItem | null>(null);
  const [mentorToTerminate, setMentorToTerminate] = useState<AdminMentorItem | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Completed Trials state
  const [completedTrials, setCompletedTrials] = useState<CompletedTrialItem[]>([]);

  // Email Logs state
  const [emailLogs, setEmailLogs] = useState<EmailLogItem[]>([]);
  const [selectedEmailLog, setSelectedEmailLog] = useState<EmailLogItem | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Global loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fast, dedicated database-side bookings query
  const loadBookings = useCallback(async (status?: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    setIsLoadingBookings(true);
    try {
      const apps = await fetchAdminAppointments({
        limit: 50,
        status: status || undefined,
        sortOrder,
      });
      setAppointments(apps.items);
    } catch (err: unknown) {
      console.error('Failed to load appointments:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  }, []);

  const loadAllAdminData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [sum, mList, apps, comp, emails, notifs] = await Promise.all([
        fetchAdminDashboard(),
        fetchAdminMentors(),
        fetchAdminAppointments({ limit: 50, sortOrder: 'asc' }),
        fetchCompletedTrials({ limit: 50 }),
        fetchEmailLogs(),
        fetchNotifications(),
      ]);

      setSummary(sum);
      setMentors(mList);
      setAppointments(apps.items);
      setCompletedTrials(comp.items);
      setEmailLogs(emails);
      setNotifications(notifs.notifications);
      setUnreadNotifCount(notifs.unreadCount);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load admin data');
    } finally {
      setIsLoading(false);
      setIsLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const handleStatusFilterChange = (status: string) => {
    setBookingStatusFilter(status);
    loadBookings(status, bookingSortOrder);
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setBookingSortOrder(order);
    loadBookings(bookingStatusFilter, order);
  };

  const handleCancelBooking = (bookingId: string) => {
    const app = appointments.find((a) => a.id === bookingId);
    if (app) {
      setBookingToCancel(app);
    }
  };

  const handleCreateMentor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMentorName || !newMentorEmail) return;

    setIsCreatingMentor(true);
    try {
      await createAdminMentor({
        fullName: newMentorName,
        email: newMentorEmail,
        password: newMentorPassword,
        timezone: newMentorTimezone,
        isActive: true,
      });

      setIsAddMentorOpen(false);
      setNewMentorName('');
      setNewMentorEmail('');
      await loadAllAdminData();
      setActionFeedback({
        type: 'success',
        message: `Mentor ${newMentorName} successfully created and added to capacity.`,
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to create mentor.',
      });
    } finally {
      setIsCreatingMentor(false);
    }
  };

  const handleInspectMentor = async (mentorId: string) => {
    setInspectingMentorId(mentorId);
    setIsLoadingInspector(true);
    try {
      const data = await fetchAdminMentorDashboard(mentorId);
      setInspectedMentorData(data);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to load mentor dashboard',
      });
    } finally {
      setIsLoadingInspector(false);
    }
  };

  // Terminate mentor handler with in-app confirmation modal
  const handleConfirmTerminateMentor = async () => {
    if (!mentorToTerminate) return;
    const { id, fullName } = mentorToTerminate;
    try {
      await terminateAdminMentor(id);
      const [mList, sum] = await Promise.all([
        fetchAdminMentors(),
        fetchAdminDashboard(),
      ]);
      setMentors(mList);
      setSummary(sum);

      setActionFeedback({
        type: 'success',
        message: `Mentor ${fullName} has been terminated and excluded from active scheduling capacity. All historical appointments and records are preserved.`,
      });
      setMentorToTerminate(null);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to terminate mentor.',
      });
    }
  };

  const handleReactivateMentor = async (mentorId: string) => {
    try {
      await reactivateAdminMentor(mentorId);
      const [mList, sum] = await Promise.all([
        fetchAdminMentors(),
        fetchAdminDashboard(),
      ]);
      setMentors(mList);
      setSummary(sum);

      setActionFeedback({
        type: 'success',
        message: 'Mentor has been reactivated and restored to daily capacity.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reactivate mentor.',
      });
    }
  };

  const handleApproveUnavailability = async (unavailabilityId: string) => {
    try {
      await approveAdminMentorUnavailability(unavailabilityId);
      await loadAllAdminData();
      setActionFeedback({
        type: 'success',
        message: 'Mentor unavailability request approved.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to approve unavailability.',
      });
    }
  };

  const handleRejectUnavailability = async (unavailabilityId: string) => {
    try {
      await rejectAdminMentorUnavailability(unavailabilityId);
      await loadAllAdminData();
      setActionFeedback({
        type: 'success',
        message: 'Mentor unavailability request rejected.',
      });
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to reject unavailability.',
      });
    }
  };

  // Cancel booking handler with in-app confirmation modal
  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    const { id, bookingId } = bookingToCancel;
    setCancellingId(id);
    try {
      await cancelAdminAppointment(id);

      // Refresh appointments and dashboard metrics immediately
      const [apps, sum, mList] = await Promise.all([
        fetchAdminAppointments({ limit: 50, status: bookingStatusFilter || undefined, sortOrder: bookingSortOrder }),
        fetchAdminDashboard(),
        fetchAdminMentors(),
      ]);

      setAppointments(apps.items);
      setSummary(sum);
      setMentors(mList);

      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      }

      setActionFeedback({
        type: 'success',
        message: `Booking ${bookingId} has been successfully cancelled. Daily capacity has been released and metrics updated.`,
      });
      setBookingToCancel(null);
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to cancel appointment.',
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadNotifCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const formatTzDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#172033] flex flex-col font-sans selection:bg-[#172033] selection:text-white">
      {/* Top Admin Header */}
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
                  Global Academic Administration
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Indicator Button */}
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 rounded-xl border border-[#E5E7EB] hover:bg-slate-50 transition-colors text-[#334155]"
              title="View Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

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
        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs shadow-2xs ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{actionFeedback.message}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Active Mentors</span>
            <div className="text-2xl font-bold text-[#172033] font-serif">
              {summary ? summary.activeMentorsCount : '...'}
            </div>
            <span className="text-[11px] text-[#4F6B8A]">
              Daily Capacity: {summary ? summary.totalDailyCapacity : 20} classes/day
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Total Booked Classes</span>
            <div className="text-2xl font-bold text-[#172033] font-serif">
              {summary
                ? (summary as any).totalBookedAppointments ??
                  summary.confirmedAppointments + summary.completedAppointments
                : '...'}
            </div>
            <span className="text-[11px] text-blue-700">All Non-Cancelled Bookings</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Completed Classes</span>
            <div className="text-2xl font-bold text-emerald-800 font-serif">
              {summary
                ? (summary as any).completedRatio ||
                  `${summary.completedAppointments} / ${(summary as any).totalBookedAppointments ?? summary.confirmedAppointments + summary.completedAppointments}`
                : '...'}
            </div>
            <span className="text-[11px] text-emerald-700">Completed / Total Booked</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-1">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Today&apos;s Classes</span>
            <div className="text-2xl font-bold text-[#172033] font-serif">
              {summary
                ? (summary as any).todayRatio ||
                  `${summary.todayAppointmentsCount} / ${summary.totalDailyCapacity || 20}`
                : '...'}
            </div>
            <span className="text-[11px] text-[#64748B]">Today&apos;s Booked / Total Daily Capacity</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#E5E7EB] pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('mentors')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'mentors'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Mentors Management ({mentors.length})
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'bookings'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Trial Bookings ({appointments.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'completed'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Actual Completed Trials ({completedTrials.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
              activeTab === 'emails'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            Email Delivery Logs ({emailLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'notifications'
                ? 'bg-[#172033] text-white'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-slate-100'
            }`}
          >
            <span>In-App Notifications</span>
            {unreadNotifCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifCount}
              </span>
            )}
          </button>
        </div>

        {/* TAB CONTENTS */}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Recent Bookings (7 cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172033] font-serif">Recent Trial Class Bookings</h3>
                <button
                  onClick={() => setActiveTab('bookings')}
                  className="text-xs font-semibold text-[#4F6B8A] hover:text-[#172033]"
                >
                  View all →
                </button>
              </div>

              <div className="space-y-2">
                {appointments.slice(0, 6).map((app) => (
                  <div
                    key={app.id}
                    onClick={() => setSelectedBooking(app)}
                    className="p-3 rounded-xl border border-[#E5E7EB] hover:border-[#4F6B8A] bg-[#FAFAF8] flex items-center justify-between gap-3 text-xs cursor-pointer transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#4F6B8A]">{app.bookingId}</span>
                        <span className="font-semibold text-[#172033]">{app.studentName}</span>
                      </div>
                      <span className="text-[#64748B] text-[11px]">
                        {app.subject} · Mentor: {app.mentor.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          app.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : app.status === 'CONFIRMED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {app.status}
                      </span>
                      <span className="block text-[10px] text-[#64748B] font-mono mt-0.5">
                        {formatTzDate(app.startTime)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Daily Capacity Glance (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#172033] font-serif">Today&apos;s Mentor Capacity</h3>
                <button
                  onClick={() => setActiveTab('mentors')}
                  className="text-xs font-semibold text-[#4F6B8A] hover:text-[#172033]"
                >
                  Manage →
                </button>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-auto">
                {mentors.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAF8] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <strong className="text-[#172033] block">{m.fullName}</strong>
                      <span className="text-[#64748B] text-[11px] font-mono">{m.email}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[#172033] font-mono">
                        {m.todayAppointmentsCount} / {m.dailyLimit}
                      </span>
                      <span className="block text-[10px] text-[#64748B]">
                        {m.isDailyLimitReached ? 'Limit Reached' : `${m.remainingTodayCapacity} slot left`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. MENTORS MANAGEMENT TAB */}
        {activeTab === 'mentors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#172033] font-serif">Codeyoung Faculty Mentors</h3>
              <button
                onClick={() => setIsAddMentorOpen(true)}
                className="inline-flex items-center gap-1.5 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xs transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Mentor</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-3.5">Mentor Name</th>
                      <th className="p-3.5">Email</th>
                      <th className="p-3.5">Timezone</th>
                      <th className="p-3.5">Today&apos;s Classes</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {mentors.map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="p-3.5 font-bold text-[#172033]">{m.fullName}</td>
                        <td className="p-3.5 font-mono text-[#4F6B8A]">{m.email}</td>
                        <td className="p-3.5 text-[#64748B] font-mono">{m.timezone}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-[#172033]">
                            {m.todayAppointmentsCount} / {m.dailyLimit}
                          </span>
                          <span className="text-[#64748B] ml-2 text-[11px]">
                            ({m.isDailyLimitReached ? 'Full' : `${m.remainingTodayCapacity} left`})
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              m.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {m.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => handleInspectMentor(m.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#172033] hover:text-[#4F6B8A] bg-[#F1F5F9] px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <span>Dashboard</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          {m.isActive ? (
                            <button
                              onClick={() => setMentorToTerminate(m)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Terminate mentor and remove from capacity while preserving historical bookings"
                            >
                              <span>Terminate</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateMentor(m.id)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              title="Reactivate mentor and restore to daily capacity"
                            >
                              <span>Reactivate</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mentor Unavailability Requests Approval Workflow */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-[#172033] font-serif">
                  Mentor Unavailability Requests Review
                </h3>
                <p className="text-xs text-[#64748B]">
                  Approve or reject time-off requests submitted by mentors. Only APPROVED requests block the trial scheduler.
                </p>
              </div>

              {mentors.flatMap((m) =>
                m.unavailabilities.map((u) => ({ ...u, mentorName: m.fullName, mentorEmail: m.email, mentorTz: m.timezone }))
              ).length === 0 ? (
                <div className="py-8 text-center text-xs text-[#64748B] bg-[#FAFAF8] rounded-xl border border-[#E5E7EB]">
                  No unavailability requests submitted by mentors.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                      <tr>
                        <th className="p-3.5">Mentor</th>
                        <th className="p-3.5">Requested Period</th>
                        <th className="p-3.5">Reason</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Approval Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {mentors
                        .flatMap((m) =>
                          m.unavailabilities.map((u) => ({
                            ...u,
                            mentorName: m.fullName,
                            mentorEmail: m.email,
                            mentorTz: m.timezone,
                          }))
                        )
                        .map((u) => {
                          const status = u.status || 'PENDING';
                          const isPending = status === 'PENDING';
                          const isApproved = status === 'APPROVED';

                          return (
                            <tr key={u.id} className="hover:bg-[#FAFAF8] transition-colors">
                              <td className="p-3.5">
                                <strong className="text-[#172033] block">{u.mentorName}</strong>
                                <span className="font-mono text-[#64748B] text-[11px]">{u.mentorEmail}</span>
                              </td>
                              <td className="p-3.5 font-mono text-[#172033]">
                                {formatTzDate(u.startDate)} – {formatTzDate(u.endDate)}
                              </td>
                              <td className="p-3.5 text-[#334155]">{u.reason || 'Personal time off'}</td>
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
                              <td className="p-3.5 text-right space-x-2">
                                {isPending ? (
                                  <>
                                    <button
                                      onClick={() => handleApproveUnavailability(u.id)}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleRejectUnavailability(u.id)}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                  </>
                                ) : (
                                  <span className="text-xs text-[#64748B] italic">
                                    {isApproved ? 'Approved (Blocks Slots)' : 'Rejected'}
                                  </span>
                                )}
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

        {/* 3. TRIAL BOOKINGS TAB */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033] font-serif">All Trial Class Bookings</h3>
                <p className="text-xs text-[#64748B]">Sorted earliest first with assigned mentor and parent details.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bookingSortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value as 'asc' | 'desc')}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none"
                  title="Sort by booking date and time"
                >
                  <option value="asc">Earliest First</option>
                  <option value="desc">Latest First</option>
                </select>

                <select
                  value={bookingStatusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs text-[#172033] focus:outline-none"
                  title="Filter by booking status"
                >
                  <option value="">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>

                {isLoadingBookings && (
                  <Loader2 className="w-4 h-4 animate-spin text-[#4F6B8A]" />
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-3.5">Booking ID</th>
                      <th className="p-3.5">Student</th>
                      <th className="p-3.5">Subject</th>
                      <th className="p-3.5">Parent Contact</th>
                      <th className="p-3.5">Assigned Mentor</th>
                      <th className="p-3.5">Date / Time</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {appointments.map((app) => (
                      <tr key={app.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="p-3.5 font-mono font-bold text-[#4F6B8A]">{app.bookingId}</td>
                        <td className="p-3.5 font-semibold text-[#172033]">{app.studentName}</td>
                        <td className="p-3.5 text-[#334155]">{app.subject}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-[#172033] block">{app.parent.name}</span>
                          <span className="font-mono text-[#64748B] text-[11px]">{app.parent.email}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-[#172033]">{app.mentor.name}</td>
                        <td className="p-3.5 font-mono text-[#64748B]">{formatTzDate(app.startTime)}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              app.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700'
                                : app.status === 'CONFIRMED'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => setSelectedBooking(app)}
                            className="text-xs font-semibold text-[#172033] hover:text-[#4F6B8A] cursor-pointer"
                          >
                            Details
                          </button>
                          {app.status === 'CONFIRMED' && (
                            <button
                              disabled={cancellingId === app.id}
                              onClick={() => handleCancelBooking(app.id)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-800 cursor-pointer"
                            >
                              {cancellingId === app.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. ACTUAL COMPLETED TRIALS TAB */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033] font-serif">
                  Actual Students Who Took the Trial
                </h3>
                <p className="text-xs text-[#64748B]">
                  Records driven strictly by verified TrialAttendance completion records.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-3.5">Student Name</th>
                      <th className="p-3.5">Subject</th>
                      <th className="p-3.5">Parent Contact</th>
                      <th className="p-3.5">Assigned Mentor</th>
                      <th className="p-3.5">Completed Timestamp</th>
                      <th className="p-3.5">Mentor Notes</th>
                      <th className="p-3.5">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {completedTrials.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-[#64748B]">
                          No completed trials recorded yet. Once mentors mark trials as completed, they will appear here.
                        </td>
                      </tr>
                    ) : (
                      completedTrials.map((t) => (
                        <tr key={t.attendanceId} className="hover:bg-[#FAFAF8] transition-colors">
                          <td className="p-3.5 font-bold text-[#172033]">{t.studentName}</td>
                          <td className="p-3.5 font-semibold text-[#4F6B8A]">{t.subject}</td>
                          <td className="p-3.5 text-[#64748B]">
                            {t.parent.name} ({t.parent.email})
                          </td>
                          <td className="p-3.5 font-semibold text-[#172033]">{t.mentor.name}</td>
                          <td className="p-3.5 font-mono text-[#64748B]">
                            {t.completedAt ? formatTzDate(t.completedAt) : 'Completed'}
                          </td>
                          <td className="p-3.5 text-slate-700 italic max-w-xs truncate">
                            {t.mentorNotes || '—'}
                          </td>
                          <td className="p-3.5">
                            <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              COMPLETED
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. EMAIL LOGS TAB */}
        {activeTab === 'emails' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033] font-serif">
                  Transactional Email Delivery History
                </h3>
                <p className="text-xs text-[#64748B]">
                  Live delivery audit log tracking Resend transactional emails to parents and mentors.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-semibold border-b border-[#E5E7EB]">
                    <tr>
                      <th className="p-3.5">Recipient</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5">Subject</th>
                      <th className="p-3.5">Delivery Status</th>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {emailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAFAF8] transition-colors">
                        <td className="p-3.5 font-mono font-semibold text-[#172033]">{log.recipientEmail}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-[10px] uppercase text-[#4F6B8A] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                            {log.recipientType}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-[#334155]">{log.subject}</td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              log.status === 'SENT'
                                ? 'bg-emerald-50 text-emerald-700'
                                : log.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[#64748B]">{formatTzDate(log.createdAt)}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedEmailLog(log)}
                            className="text-xs font-semibold text-[#172033] hover:text-[#4F6B8A]"
                          >
                            View Content
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#172033] font-serif">In-App Notification Center</h3>
                <p className="text-xs text-[#64748B]">System alerts for new bookings, completed trials, and email delivery warnings.</p>
              </div>

              {unreadNotifCount > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4F6B8A] hover:text-[#172033] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-lg"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    n.isRead ? 'bg-white border-[#E5E7EB] opacity-75' : 'bg-blue-50/40 border-blue-200 shadow-2xs'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          n.type === 'NEW_TRIAL_BOOKING'
                            ? 'bg-blue-100 text-blue-800'
                            : n.type === 'TRIAL_COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {n.type}
                      </span>
                      <span className="text-xs font-bold text-[#172033]">{n.title}</span>
                      <span className="text-[10px] text-[#64748B] font-mono">{formatTzDate(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[#334155]">{n.message}</p>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkNotifRead(n.id)}
                      className="p-1 text-[#64748B] hover:text-[#172033]"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Add Mentor Modal */}
      {isAddMentorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#172033] font-serif">Add New Mentor</h3>
                <p className="text-xs text-[#64748B]">Create mentor account with role MENTOR in database</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMentorOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMentor} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-[#334155]">Full Name</label>
                <input
                  type="text"
                  required
                  value={newMentorName}
                  onChange={(e) => setNewMentorName(e.target.value)}
                  placeholder="e.g. Tanvi Desai"
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#334155]">Email Address</label>
                <input
                  type="email"
                  required
                  value={newMentorEmail}
                  onChange={(e) => setNewMentorEmail(e.target.value)}
                  placeholder="e.g. mntr011@codeyoung.in"
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#334155]">Default Password</label>
                <input
                  type="text"
                  value={newMentorPassword}
                  onChange={(e) => setNewMentorPassword(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-[#334155]">Timezone</label>
                <input
                  type="text"
                  value={newMentorTimezone}
                  onChange={(e) => setNewMentorTimezone(e.target.value)}
                  className="w-full bg-[#FAFAF8] border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-mono text-[#172033] focus:outline-none focus:border-[#172033]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddMentorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingMentor}
                  className="inline-flex items-center gap-2 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  {isCreatingMentor && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Mentor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mentor Dashboard Inspector Modal (/admin/mentors/:mentorId) */}
      {inspectingMentorId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F6B8A]">
                  Admin Mentor Inspector
                </span>
                <h3 className="text-xl font-bold text-[#172033] font-serif">
                  {inspectedMentorData?.mentor?.fullName || 'Mentor Dashboard View'}
                </h3>
                <p className="text-xs text-[#64748B] font-mono">
                  {inspectedMentorData?.mentor?.email} · {inspectedMentorData?.mentor?.timezone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingMentorId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingInspector ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#172033] mb-2" />
                <span>Loading mentor schedule & operational data...</span>
              </div>
            ) : inspectedMentorData ? (
              <div className="space-y-4 text-xs">
                <div className="bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                  <div>
                    <span className="text-[#64748B] block">Today&apos;s Capacity</span>
                    <strong className="text-base text-[#172033]">
                      {inspectedMentorData.dailyCapacity?.todayCount} / {inspectedMentorData.dailyCapacity?.totalLimit} classes
                    </strong>
                  </div>
                  <span className="text-[11px] text-[#4F6B8A]">
                    {inspectedMentorData.dailyCapacity?.isLimitReached ? 'Limit reached' : 'Slots available'}
                  </span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#172033]">Today&apos;s Assigned Classes</h4>
                  {inspectedMentorData.todaySchedule?.length === 0 ? (
                    <p className="text-slate-400">No appointments scheduled for today.</p>
                  ) : (
                    inspectedMentorData.todaySchedule?.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-3 bg-white border border-[#E5E7EB] rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-[#4F6B8A]">{app.bookingId}</span>
                          <p className="font-bold text-[#172033]">{app.studentName} ({app.subject})</p>
                          <span className="text-[11px] text-[#64748B]">Parent: {app.parentName}</span>
                        </div>
                        <span className="font-mono text-[#172033]">{formatTzDate(app.startTime)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Email Log Inspector Modal */}
      {selectedEmailLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#4F6B8A] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  {selectedEmailLog.recipientType}
                </span>
                <h3 className="text-base font-bold text-[#172033] font-serif mt-1">
                  {selectedEmailLog.subject}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmailLog(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB]">
              <div>
                <span className="text-[#64748B]">Recipient:</span>{' '}
                <strong className="font-mono text-[#172033]">{selectedEmailLog.recipientEmail}</strong>
              </div>
              <div>
                <span className="text-[#64748B]">Status:</span>{' '}
                <span className="font-bold uppercase text-emerald-700">{selectedEmailLog.status}</span>
              </div>
              {selectedEmailLog.errorMessage && (
                <div className="text-rose-700 bg-rose-50 p-2 rounded-lg">
                  <span>Error: {selectedEmailLog.errorMessage}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-[#334155]">Generated Email Content:</label>
              <pre className="p-3 bg-[#172033] text-slate-100 rounded-xl overflow-x-auto text-[11px] whitespace-pre-wrap font-mono">
                {selectedEmailLog.emailContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Trial Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#4F6B8A] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
                  {selectedBooking.bookingId}
                </span>
                <h3 className="text-lg font-bold text-[#172033] font-serif mt-1">
                  Trial Booking Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[#64748B] block">Student:</span>
                  <strong className="text-sm text-[#172033]">{selectedBooking.studentName}</strong>
                </div>
                <div>
                  <span className="text-[#64748B] block">Grade:</span>
                  <strong className="text-sm text-[#172033]">{selectedBooking.studentGrade}</strong>
                </div>
              </div>

              <div>
                <span className="text-[#64748B] block">Subject:</span>
                <strong className="text-[#172033]">{selectedBooking.subject}</strong>
              </div>

              {selectedBooking.learningGoal && (
                <div>
                  <span className="text-[#64748B] block">Learning Goal:</span>
                  <p className="text-slate-700 italic mt-0.5">{selectedBooking.learningGoal}</p>
                </div>
              )}

              <div className="pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#64748B] block">Parent Contact:</span>
                <span className="font-semibold text-[#172033]">{selectedBooking.parent.name}</span>
                <span className="block font-mono text-[#64748B] text-[11px]">{selectedBooking.parent.email}</span>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB]">
                <span className="text-[#64748B] block">Assigned Mentor:</span>
                <span className="font-semibold text-[#172033]">{selectedBooking.mentor.name}</span>
                <span className="block font-mono text-[#64748B] text-[11px]">{selectedBooking.mentor.email}</span>
              </div>

              <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <span className="text-[#64748B] block">Scheduled Time:</span>
                  <span className="font-mono text-[#172033] font-semibold">{formatTzDate(selectedBooking.startTime)}</span>
                </div>
                <div>
                  <span className="text-[#64748B] block">Status:</span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedBooking.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : selectedBooking.status === 'CONFIRMED'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {selectedBooking.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
              >
                Close
              </button>
              {selectedBooking.status === 'CONFIRMED' && (
                <button
                  type="button"
                  onClick={() => {
                    const toCancel = selectedBooking;
                    setSelectedBooking(null);
                    setBookingToCancel(toCancel);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Cancel Booking</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Trial Booking Cancellation Confirmation Modal */}
      {bookingToCancel && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  {bookingToCancel.bookingId}
                </span>
                <h3 className="text-lg font-bold text-[#172033] font-serif mt-1">
                  Cancel Trial Booking
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB]">
              <div>
                <span className="text-[#64748B]">Student:</span>{' '}
                <strong className="text-[#172033]">{bookingToCancel.studentName}</strong> (Grade {bookingToCancel.studentGrade}, {bookingToCancel.subject})
              </div>
              <div>
                <span className="text-[#64748B]">Parent:</span>{' '}
                <span className="text-[#172033]">{bookingToCancel.parent.name} ({bookingToCancel.parent.email})</span>
              </div>
              <div>
                <span className="text-[#64748B]">Assigned Mentor:</span>{' '}
                <span className="text-[#172033] font-medium">{bookingToCancel.mentor.name}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Date / Time:</span>{' '}
                <span className="text-[#172033] font-mono">{formatTzDate(bookingToCancel.startTime)}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
              <p className="font-semibold">Cancellation effects:</p>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                <li>Booking status will update to CANCELLED in database</li>
                <li>Will no longer count toward mentor daily capacity</li>
                <li>Will not count in &quot;Total Booked Classes&quot;</li>
                <li>Booking history and audit trail are preserved</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBookingToCancel(null)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={cancellingId === bookingToCancel.id}
                onClick={handleConfirmCancelBooking}
                className="inline-flex items-center gap-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {cancellingId === bookingToCancel.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Termination Confirmation Modal */}
      {mentorToTerminate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E7EB] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                  Administrative Action
                </span>
                <h3 className="text-lg font-bold text-[#172033] font-serif mt-1">
                  Terminate Mentor
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMentorToTerminate(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-[#FAFAF8] p-4 rounded-xl border border-[#E5E7EB]">
              <div>
                <span className="text-[#64748B]">Mentor:</span>{' '}
                <strong className="text-[#172033]">{mentorToTerminate.fullName}</strong>
              </div>
              <div>
                <span className="text-[#64748B]">Email:</span>{' '}
                <span className="font-mono text-[#172033]">{mentorToTerminate.email}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Timezone:</span>{' '}
                <span className="font-mono text-[#172033]">{mentorToTerminate.timezone}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Active Appointments:</span>{' '}
                <span className="text-[#172033] font-bold">{mentorToTerminate.activeAppointmentsCount}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs space-y-1">
              <p className="font-semibold">Termination effects:</p>
              <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                <li>Mark mentor as terminated/inactive in database</li>
                <li>Immediately stop receiving any new bookings</li>
                <li>Remove from active mentor capacity calculation</li>
                <li>All historical appointments and records are preserved</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMentorToTerminate(null)}
                className="px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#172033]"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmTerminateMentor}
                className="inline-flex items-center gap-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <span>Confirm Termination</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
