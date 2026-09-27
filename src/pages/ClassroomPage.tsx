import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Code2,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Share2,
  CheckCircle2,
  Terminal,
  Clock,
  Sparkles,
  ChevronLeft,
  Loader2,
  Play,
  RotateCw,
  ShieldCheck,
  User,
  Users,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { recordClassJoin, completeAppointment } from '../api/mentor';

export const ClassroomPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [hasJoined, setHasJoined] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [activeCodeTab, setActiveCodeTab] = useState<'scratch' | 'python' | 'web'>('scratch');
  const [codeOutput, setCodeOutput] = useState('Welcome to your Codeyoung 1:1 STEM trial session! Click "Run Code" to execute your project.');
  const [isRunningCode, setIsRunningCode] = useState(false);

  // Mentor completion state
  const [isCompleting, setIsCompleting] = useState(false);
  const [mentorNotes, setMentorNotes] = useState('');
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);
  const [completionSuccess, setCompletionSuccess] = useState(false);

  const isMentor = user?.role === 'MENTOR';
  const isAdmin = user?.role === 'ADMIN';

  const bookingCode = appointmentId
    ? appointmentId.startsWith('BK-')
      ? appointmentId
      : `BK-${appointmentId.substring(0, 6).toUpperCase()}`
    : 'BK-TRIAL';

  useEffect(() => {
    // If logged in as mentor, record join timestamp
    if (isAuthenticated && isMentor && appointmentId && !appointmentId.startsWith('BK-')) {
      recordClassJoin(appointmentId).catch(() => {});
    }
  }, [isAuthenticated, isMentor, appointmentId]);

  const handleJoinClass = () => {
    setHasJoined(true);
    if (isAuthenticated && isMentor && appointmentId && !appointmentId.startsWith('BK-')) {
      recordClassJoin(appointmentId).catch(() => {});
    }
  };

  const handleRunCode = () => {
    setIsRunningCode(true);
    setTimeout(() => {
      if (activeCodeTab === 'scratch') {
        setCodeOutput('🐱 Scratch Sprite: Moving 10 steps...\n🎉 Success! Sprite completed the obstacle course.');
      } else if (activeCodeTab === 'python') {
        setCodeOutput('🚀 Python 3.12 Engine:\n>>> import turtle\n>>> turtle.circle(50)\n>>> Output: Shape rendered successfully! STEM Student logic verified.');
      } else {
        setCodeOutput('🌐 Web Dev HTML/CSS Engine:\n>>> Rendering interactive game canvas on port 3000...\n>>> Build Status: 100% Complete.');
      }
      setIsRunningCode(false);
    }, 450);
  };

  const handleCompleteTrial = async () => {
    if (!appointmentId || appointmentId.startsWith('BK-')) {
      setCompletionSuccess(true);
      setIsCompletedModalOpen(false);
      return;
    }

    setIsCompleting(true);
    try {
      await completeAppointment(appointmentId, mentorNotes);
      setCompletionSuccess(true);
      setIsCompletedModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark trial completed');
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Classroom Bar */}
      <header className="h-16 px-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to={
              isAdmin
                ? '/admin/dashboard'
                : isMentor
                ? '/mentor/dashboard'
                : user
                ? '/student/dashboard'
                : '/'
            }
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            title="Exit Classroom"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Codeyoung Live 1:1 Classroom</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800/80">
                  {bookingCode}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Accredited STEM Learning Environment</p>
            </div>
          </div>
        </div>

        {/* Action / State items */}
        <div className="flex items-center gap-3">
          {completionSuccess ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
              <span>Trial Completed & Recorded</span>
            </span>
          ) : isMentor ? (
            <button
              onClick={() => setIsCompletedModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Trial Completed</span>
            </button>
          ) : null}

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted WebRTC Channel</span>
          </div>
        </div>
      </header>

      {/* Main Classroom Grid */}
      <main className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Video / Live Call Stage (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Main Video Screen */}
          <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center p-6 min-h-[300px]">
            {!hasJoined ? (
              <div className="text-center space-y-4 max-w-xs">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center mx-auto text-blue-400">
                  <Video className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Your Trial Session is Ready</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Your expert Codeyoung STEM instructor is in the room.
                  </p>
                </div>
                <button
                  onClick={handleJoinClass}
                  className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>Join Live Classroom</span>
                </button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-between">
                {/* Simulated Instructor & Student Split Streams */}
                <div className="grid grid-cols-2 gap-3 flex-1">
                  <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col justify-between relative">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-blue-400 font-semibold">
                        <User className="w-3 h-3" /> Mentor
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-blue-900/60 border border-blue-700/60 flex items-center justify-center mx-auto text-blue-200 font-bold text-base">
                        CY
                      </div>
                      <span className="text-xs font-semibold text-slate-200 mt-2 block">Codeyoung Mentor</span>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center">Screen Shared & Speaking</span>
                  </div>

                  <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col justify-between relative">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                        <Users className="w-3 h-3" /> Student
                      </span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-amber-900/60 border border-amber-700/60 flex items-center justify-center mx-auto text-amber-200 font-bold text-base">
                        ST
                      </div>
                      <span className="text-xs font-semibold text-slate-200 mt-2 block">Student Workspace</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 text-center font-medium">Coding Live</span>
                  </div>
                </div>

                {/* Stream Controls */}
                <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setMicOn(!micOn)}
                    className={`p-2.5 rounded-full transition-colors ${
                      micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                    }`}
                    title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
                  >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`p-2.5 rounded-full transition-colors ${
                      cameraOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                    }`}
                    title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                  >
                    {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleRunCode}
                    className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Project</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Session Overview & Curriculum Goals */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Trial Session Learning Outcomes</span>
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Understand loops, variables, and sequence logic through interactive coding</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Build, test, and run a complete mini-game or algorithm</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Receive personalized 1:1 learning trajectory evaluation from your mentor</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Interactive Code Workspace & Output (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[500px]">
          {/* Workspace Tabs */}
          <div className="px-4 pt-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveCodeTab('scratch')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
                  activeCodeTab === 'scratch'
                    ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Scratch Blocks
              </button>
              <button
                onClick={() => setActiveCodeTab('python')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
                  activeCodeTab === 'python'
                    ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Python STEM Script
              </button>
              <button
                onClick={() => setActiveCodeTab('web')}
                className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors ${
                  activeCodeTab === 'web'
                    ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Interactive Web Canvas
              </button>
            </div>

            <button
              onClick={handleRunCode}
              disabled={isRunningCode}
              className="mb-1 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              {isRunningCode ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Execute</span>
            </button>
          </div>

          {/* Interactive Code Area */}
          <div className="flex-1 p-4 font-mono text-xs overflow-auto bg-slate-950 text-slate-200">
            {activeCodeTab === 'scratch' && (
              <div className="space-y-3 font-sans">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <strong>[ When Green Flag Clicked ]</strong>
                </div>
                <div className="p-3 ml-4 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200">
                  <span>↳ repeat (10) times</span>
                  <div className="p-2 ml-4 mt-2 rounded-lg bg-indigo-500/20 text-indigo-200">
                    <span>↳ move (10) steps & turn (15) degrees</span>
                  </div>
                </div>
                <div className="p-3 ml-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                  <span>↳ say (&quot;Hello Codeyoung! I built my first game!&quot;) for (2) secs</span>
                </div>
              </div>
            )}

            {activeCodeTab === 'python' && (
              <pre className="text-slate-300 leading-relaxed font-mono">
                <code>{`# Codeyoung Trial Project: Galactic STEM Explorer
import math

class RobotExplorer:
    def __init__(self, name):
        self.name = name
        self.energy = 100
        self.crystals_collected = 0

    def scan_planet(self, sector):
        print(f"[{self.name}] Scanning sector {sector} for minerals...")
        self.crystals_collected += 5
        self.energy -= 10
        return f"Found 5 energy crystals! Energy: {self.energy}%"

# Launch interactive explorer
explorer = RobotExplorer("Rover-01")
print(explorer.scan_planet("Alpha-Centauri"))
print("Trial Project Ready for Live Play! 🚀")
`}</code>
              </pre>
            )}

            {activeCodeTab === 'web' && (
              <pre className="text-slate-300 leading-relaxed font-mono">
                <code>{`<!DOCTYPE html>
<html>
  <head>
    <title>My First Codeyoung Game</title>
    <style>
      canvas { background: #0f172a; border-radius: 12px; }
    </style>
  </head>
  <body>
    <h1>Welcome to STEM Game Studio</h1>
    <canvas id="game" width="400" height="250"></canvas>
  </body>
</html>`}</code>
              </pre>
            )}
          </div>

          {/* Console / Output Terminal */}
          <div className="h-40 border-t border-slate-800 bg-slate-900/90 p-3 font-mono text-xs text-slate-300 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Console Output</span>
              </span>
              <span className="text-[10px] text-emerald-400">● Live Connected</span>
            </div>
            <div className="overflow-auto py-2 whitespace-pre-wrap text-emerald-300">
              {codeOutput}
            </div>
          </div>
        </div>
      </main>

      {/* Mentor Completion Modal */}
      {isCompletedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Complete Trial Class</h3>
                <p className="text-xs text-slate-400">Record attendance & write mentor feedback notes</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Mentor Notes / Student Assessment (Optional)
              </label>
              <textarea
                value={mentorNotes}
                onChange={(e) => setMentorNotes(e.target.value)}
                placeholder="Student showed great aptitude for logical thinking and finished the obstacle challenge..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCompletedModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteTrial}
                disabled={isCompleting}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
              >
                {isCompleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Trial Completed</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
