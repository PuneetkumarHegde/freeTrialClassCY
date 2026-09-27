import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Code2,
  LogOut,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  BookOpen,
  User,
  GraduationCap,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface ParentAppointment {
  id: string;
  studentName: string;
  studentGrade: string;
  subject: string;
  learningGoal?: string;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  meetingLink: string;
  createdAt: string;
  parentTimezone: string;
  mentor: {
    name: string;
  };
}

export const StudentDashboard: React.FC = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<ParentAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!token) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const res = await fetch('/api/parent/appointments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!res.ok || data.status === 'error') {
          throw new Error(data.message || 'Failed to load appointments');
        }
        setAppointments(data.data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading appointments';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAppointments();
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoStart: string, isoEnd: string) => {
    try {
      const s = new Date(isoStart);
      const e = new Date(isoEnd);
      return `${s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } catch {
      return `${isoStart} - ${isoEnd}`;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-700 flex items-center justify-center text-white">
                <Code2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-lg font-bold text-slate-900 font-serif">Codeyoung</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Parent & Student Portal
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user?.fullName}</span>
              <span className="text-xs text-slate-500">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
              Student Learning Center
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif">
              Welcome, {user?.fullName || 'Parent'}!
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed">
              Track your child&apos;s upcoming 1-on-1 STEM trial classes, join live sessions, and review customized learning goals.
            </p>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Scheduled Sessions</h2>
              <p className="text-xs text-slate-500">Live 1-on-1 classes with assigned STEM mentors</p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <span>Book Another Trial</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-700 animate-spin mx-auto" />
              <p className="text-sm text-slate-600">Loading your appointments...</p>
            </div>
          ) : errorMessage ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2 text-rose-800">
              <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
              <p className="text-sm font-semibold">{errorMessage}</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">No appointments scheduled yet</h3>
                <p className="text-xs text-slate-500">
                  You haven&apos;t booked a trial class yet or your past sessions have completed.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <span>Book Free Trial Class</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((app) => (
                <div
                  key={app.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                        {app.subject}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{app.studentName}</h3>
                      <p className="text-xs text-slate-500">{app.studentGrade}</p>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        app.status === 'CONFIRMED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : app.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{formatDate(app.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {formatTime(app.startTime, app.endTime)} ({app.parentTimezone || user?.timezone})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Mentor: {app.mentor?.name || 'Assigned Codeyoung Mentor'}</span>
                    </div>
                  </div>

                  {app.learningGoal && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-700 block mb-0.5">Focus Goal:</span>
                      <p className="italic bg-white p-2 rounded border border-slate-100">
                        &quot;{app.learningGoal}&quot;
                      </p>
                    </div>
                  )}

                  {app.status === 'CONFIRMED' && (
                    <div className="pt-2">
                      <Link
                        to={`/class/${app.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#172033] hover:bg-[#334155] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs transition-all active:scale-98"
                      >
                        <Video className="w-4 h-4" />
                        <span>Join Live Classroom</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
