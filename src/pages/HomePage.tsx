/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Calendar,
  Video,
  Globe,
  Star,
  Users,
  Code2,
  Laptop,
  GraduationCap,
  Sparkles,
  ChevronRight,
  X,
  Compass,
  Check,
  Quote,
  Terminal,
  Cpu,
  Layers,
  BookOpen,
  Award,
  Brain,
  BadgeCheck,
  Gamepad2,
  Bot,
  ChevronDown,
  Code,
  FileCode,
  FolderGit2,
  GraduationCap as GradCapIcon,
  HelpCircle,
  Zap,
  Rocket,
  Lightbulb,
  Target,
  Loader2,
  RotateCw,
  UserCheck
} from 'lucide-react';
import {
  fetchAvailableSlots,
  formatSlotRange,
  type SlotAvailability,
  type SelectedSlotData,
} from '../api/scheduling';
import { createBooking, type ConfirmedBookingData } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import { useTimezone } from '../context/TimezoneContext';
import { TimezoneSelector } from '../components/TimezoneSelector';
import { ScrollProgressBar } from '../components/ScrollProgressBar';
import { DynamicQuoteBanner } from '../components/DynamicQuoteBanner';

interface SubjectItem {
  id: string;
  name: string;
  category: string;
  ageGroup: string;
  level: string;
  description: string;
  icon: React.ReactNode;
  syllabus: string[];
  trialProject: {
    title: string;
    description: string;
    duration: string;
  };
  skills: string[];
  tools: string[];
  // Deep dive dropdown information
  prerequisites: string;
  weeklyStructure: { week: string; title: string; outcome: string }[];
  mentorshipModel: string;
  pedagogicalApproach: string;
  certificationTrack: string;
  faqList: { q: string; a: string }[];
}

export function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const { timezone, timezoneDetails } = useTimezone();
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Booking form state
  const [step, setStep] = useState(1);
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('Grade 4 - 5 (Ages 9-10)');
  const [subject, setSubject] = useState('Scratch & Creative Coding');
  const [learningGoal, setLearningGoal] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-09-28');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedSlotData, setSelectedSlotData] = useState<SelectedSlotData | null>(null);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isBooked, setIsBooked] = useState(false);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBookingData | null>(null);

  // View tab state: 'home' or 'teachings'
  const [currentTab, setCurrentTab] = useState<'home' | 'teachings'>('home');
  // Active subject filter in Teachings section
  const [activeSubjectId, setActiveSubjectId] = useState('scratch');

  const loadSlots = useCallback(async (date: string, tz: string) => {
    if (!date) return;
    setIsLoadingSlots(true);
    setSlotsError(null);
    try {
      const data = await fetchAvailableSlots(date, tz);
      const returnedSlots = data.slots || [];
      setSlots(returnedSlots);

      // Preserve previously selected slot if still valid and not full
      setSelectedSlotData((prev) => {
        if (!prev) return null;
        const matching = returnedSlots.find(
          (s) => s.startTime === prev.startTime && s.status !== 'FULL' && s.availableMentors > 0
        );
        if (matching) {
          const formatted = formatSlotRange(matching.startTime, matching.endTime, tz);
          return {
            startTime: matching.startTime,
            endTime: matching.endTime,
            timezone: tz,
            formattedTime: formatted,
          };
        }
        return null;
      });
    } catch (err: unknown) {
      setSlots([]);
      setSelectedSlotData(null);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "We couldn't load trial times right now. Please try again.";
      setSlotsError(msg);
    } finally {
      setIsLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#teachings') {
        setCurrentTab('teachings');
      } else {
        setCurrentTab('home');
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Fetch slots whenever booking modal is open and date/timezone changes
  useEffect(() => {
    if (isBookingOpen && selectedDate) {
      loadSlots(selectedDate, timezone);
    }
  }, [isBookingOpen, selectedDate, timezone, loadSlots]);

  const handleOpenBooking = () => {
    setIsBookingOpen(true);
    setIsBooked(false);
    setBookingError(null);
    setConfirmedBooking(null);
    setStep(1);
  };

  const handleOpenBookingWithSubject = (subjectName: string) => {
    setSubject(subjectName);
    setIsBookingOpen(true);
    setIsBooked(false);
    setBookingError(null);
    setConfirmedBooking(null);
    setStep(1);
  };

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (!selectedSlotData || isSubmittingBooking) {
        return;
      }
      setIsSubmittingBooking(true);
      setBookingError(null);
      try {
        const result = await createBooking({
          student: {
            name: studentName,
            grade: studentGrade,
            subject,
            learningGoal: learningGoal.trim() || undefined,
          },
          parent: {
            name: parentName,
            email: parentEmail,
          },
          startTime: selectedSlotData.startTime,
          endTime: selectedSlotData.endTime,
          timezone: selectedSlotData.timezone,
        });
        setConfirmedBooking(result);
        setIsBooked(true);
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error && err.message
            ? err.message
            : 'Failed to confirm your free trial booking. Please try another slot or try again.';
        setBookingError(errorMsg);
      } finally {
        setIsSubmittingBooking(false);
      }
    }
  };

  const handleSelectSubject = (subjId: string) => {
    setActiveSubjectId(subjId);
    const found = subjects.find((s) => s.id === subjId);
    if (found) {
      setSubject(found.name);
    }
    setCurrentTab('teachings');
    window.location.hash = '#teachings';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoHome = () => {
    setCurrentTab('home');
    window.location.hash = '#home';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoTeachings = () => {
    setCurrentTab('teachings');
    window.location.hash = '#teachings';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoReviews = () => {
    setCurrentTab('home');
    window.location.hash = '#testimonials';
    setTimeout(() => {
      document.getElementById('testimonials')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  // 6 Detailed Subjects for the Teachings section with deep-dive curriculum
  const subjects: SubjectItem[] = [
    {
      id: 'scratch',
      name: 'Scratch & Creative Coding',
      category: 'Block-Based Logic',
      ageGroup: 'Ages 5–9 (Grades 1–4)',
      level: 'Beginner Friendly',
      icon: <Gamepad2 className="w-5 h-5 text-amber-500" />,
      description:
        'Young learners transition from passive media consumers to creators. Using visual snap-together logic blocks, students understand core sequencing, coordinate planes, and event-driven architecture.',
      syllabus: [
        'Algorithmic Sequences, Sprite State & Animation Loops',
        'X/Y Coordinate Grid, Physics Bounds & Keyboard Controls',
        'Conditionals, Multi-Sprite Broadcasts & Score Logic',
        'Custom Sound Synthesizers, Timer Triggers & Polish'
      ],
      trialProject: {
        title: 'Galactic Asteroid Dodge Arcade',
        description:
          'Students program their own rocket ship, handle arrow key movements, spawn falling space obstacles with randomized velocity, and play a live score challenge.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['Computational Logic', 'Spatial Coordinates', 'Event Broadcasts', 'Debugging Mindset'],
      tools: ['Scratch 3.0 (MIT)', 'Sprite Vector Editor', 'Sound FX Engine'],
      prerequisites: 'Zero prior coding experience required. Basic mouse or trackpad navigation and reading proficiency for ages 5–9.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Animation & Motion Foundations', outcome: 'Animate interactive animal sprites, build cartoon dialogues, and understand looping sequences.' },
        { week: 'Weeks 5–8', title: 'Interactive Maze & Game Mechanics', outcome: 'Design 2D collision physics, coin collections, lives counters, and multi-level maze boards.' },
        { week: 'Weeks 9–12', title: 'Multi-Sprite Broadcasts & AI Bots', outcome: 'Program simple enemy chase AI bots using X/Y distance sensing and message broadcasts.' },
        { week: 'Weeks 13–16', title: 'Capstone Game & Global Showcase', outcome: 'Ship an original polished multi-stage arcade title published directly on the MIT Scratch community.' }
      ],
      mentorshipModel: '1-on-1 Dedicated Mentor with screen-share co-pilot debugging and live audio coaching.',
      pedagogicalApproach: 'Constructivist game-first learning: Children see immediate visual payoff before introducing formal abstract concepts.',
      certificationTrack: 'Codeyoung Junior Creative Programmer Certificate (Accredited STEM.org Credential)',
      faqList: [
        { q: 'Is Scratch real coding?', a: 'Yes! Scratch was developed by MIT Media Lab to teach computer science architecture—loops, variables, boolean conditionals, and event broadcasts—without typing syntax errors.' },
        { q: 'Can my child continue building after the trial?', a: 'All projects are saved to their private online cloud portfolio. They can play, edit, and share the web link with family anytime.' }
      ]
    },
    {
      id: 'python',
      name: 'Python & Game Architecture',
      category: 'Text-Based Programming',
      ageGroup: 'Ages 10–14 (Grades 5–8)',
      level: 'Beginner to Intermediate',
      icon: <Terminal className="w-5 h-5 text-blue-500" />,
      description:
        'Transitioning to authentic syntax. Students learn Python—the world’s most versatile language used across engineering and data science—with an engaging focus on game loops and procedural algorithms.',
      syllabus: [
        'Python Syntax, Dynamic Data Types & String Manipulations',
        'Decision Logic: If/Elif/Else, Boolean Truth Tables & While Loops',
        'Lists, Tuples, Dictionaries & Algorithmic Sorting',
        'Functions, Reusable Modules & Pygame Zero Architecture'
      ],
      trialProject: {
        title: 'Cyber Text Quest Simulator',
        description:
          'A responsive terminal adventure quest featuring randomized enemy encounters, character health tracking, inventory management, and branching narrative paths.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['Text Syntax Mastery', 'Procedural Decomposition', 'Error Traceback Analysis', 'Algorithmic Flow'],
      tools: ['Python 3.12', 'VS Code Online', 'Pygame Zero', 'Interactive REPL'],
      prerequisites: 'Comfortable typing on a computer keyboard. No prior programming language knowledge required.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Syntax, Data Types & Terminal Input', outcome: 'Master integers, floats, string methods, and construct terminal calculation engines.' },
        { week: 'Weeks 5–8', title: 'Flow Control & Adventure Simulations', outcome: 'Implement nested while loops, randomized battle formulas, and inventory systems.' },
        { week: 'Weeks 9–12', title: 'Data Structures & Algorithmic Thinking', outcome: 'Manipulate dictionary state databases, json persistence, and structured list sorting.' },
        { week: 'Weeks 13–16', title: 'Graphical Pygame 2D Engine', outcome: 'Build graphical 60 FPS sprite game engines with custom keyboard collision handlers.' }
      ],
      mentorshipModel: '1-on-1 Senior Software Engineer paired live, teaching clean code conventions and industry best practices.',
      pedagogicalApproach: 'Project-driven code-along where every single lesson produces an executable command-line or graphical application.',
      certificationTrack: 'Certified Python Foundation Developer & Algorithms Specialist (Level 1–3)',
      faqList: [
        { q: 'Why learn Python before other languages?', a: 'Python has the cleanest English-like syntax with zero boilerplate overhead, letting young students master algorithms before worrying about memory pointers or semicolons.' },
        { q: 'Will this help in school or competitions?', a: 'Yes, Python forms the benchmark language for middle/high school computing contests, USACO Bronze preparation, and AP Computer Science Principles.' }
      ]
    },
    {
      id: 'webdev',
      name: 'Full-Stack Web Development & Apps',
      category: 'Web & Cloud',
      ageGroup: 'Ages 12–17 (Grades 7–12)',
      level: 'Intermediate to Advanced',
      icon: <Layers className="w-5 h-5 text-indigo-500" />,
      description:
        'Understanding how modern software works on the internet. Students build clean, responsive, accessible websites and interactive web applications utilizing industry-standard markup and JavaScript.',
      syllabus: [
        'Semantic HTML5 Architecture, Web Accessibility & SEO Essentials',
        'Modern CSS3: Flexbox, Grid Systems, Media Queries & Transitions',
        'JavaScript DOM API: Event Listeners, State & Async Fetch',
        'Component Thinking, Modern Web Tooling & Cloud Deployment'
      ],
      trialProject: {
        title: 'Interactive Planetary Orbit Explorer',
        description:
          'A responsive single-page web app with animated orbital mechanics, dynamic dark/light theme switching, and live astronomy API query cards.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['DOM Manipulation', 'Responsive CSS Design', 'Client-Side State', 'Software Architecture'],
      tools: ['HTML5 / CSS3', 'JavaScript (ES6+)', 'Chrome DevTools', 'Vite / VS Code'],
      prerequisites: 'Basic computer literacy and comfort reading and editing text code files in a browser code editor.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Modern HTML5 & Semantic Web Structure', outcome: 'Structure accessible web pages with forms, audio/video tags, and clean navigation.' },
        { week: 'Weeks 5–8', title: 'CSS3 Flexbox, Grid & Responsive Layouts', outcome: 'Style modern desktop-to-mobile layouts with responsive viewports, CSS animations, and themes.' },
        { week: 'Weeks 9–12', title: 'Vanilla JavaScript & Dynamic DOM State', outcome: 'Handle click/keyboard events, dynamically render user data, and manipulate web page state.' },
        { week: 'Weeks 13–16', title: 'Async APIs & Full-Stack Deployment', outcome: 'Fetch live weather/astronomy REST APIs and deploy a public HTTPS website to the cloud.' }
      ],
      mentorshipModel: '1-on-1 Professional Web Engineer coaching real-world Git, browser debugging, and responsive design systems.',
      pedagogicalApproach: 'Ship real web products from day one. Every project is hosted live with a custom shareable URL for college portfolios.',
      certificationTrack: 'Codeyoung Full-Stack Web Developer Diploma & Portfolio Accreditation',
      faqList: [
        { q: 'Will my child build actual websites hosted online?', a: 'Yes! Every student publishes their projects to real public cloud hosts (like Vercel and GitHub Pages) with their own web domain.' },
        { q: 'Is modern JavaScript included?', a: 'Yes, ES6+ features including arrow functions, destructuring, promises, and async/await are taught comprehensively.' }
      ]
    },
    {
      id: 'ai-ml',
      name: 'Artificial Intelligence & Machine Learning',
      category: 'Cutting-Edge AI',
      ageGroup: 'Ages 12–17 (Grades 7–12)',
      level: 'Intermediate to Advanced',
      icon: <Brain className="w-5 h-5 text-purple-500" />,
      description:
        'Demystifying artificial intelligence through hands-on model training. Students train computer vision models, understand neural networks conceptually, and evaluate model bias and ethics.',
      syllabus: [
        'How Machines Learn: Supervised vs Unsupervised Data Patterns',
        'Computer Vision & Audio Classification Model Training',
        'Connecting AI Inference to Python and Web Interfaces',
        'Natural Language Processing, Large Models & Ethical AI'
      ],
      trialProject: {
        title: 'Real-Time Webcam Gesture Controller',
        description:
          'Students train a custom neural model using their webcam to classify hand gestures (Rock, Paper, Scissors) and link it to an interactive game script.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['Model Training Intuition', 'Data Preprocessing', 'Confidence Thresholding', 'AI Ethics'],
      tools: ['Google Teachable Machine', 'TensorFlow.js', 'Python Data Basics'],
      prerequisites: 'Recommended for students with basic Python or JavaScript exposure, or analytical problem-solving aptitude.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Dataset Collection & Computer Vision', outcome: 'Train image classification models with webcam training samples and test confidence scores.' },
        { week: 'Weeks 5–8', title: 'Audio & Pose Estimation Neural Networks', outcome: 'Build voice-activated controllers and pose-tracking fitness counters.' },
        { week: 'Weeks 9–12', title: 'NLP, Sentiment Analysis & Chatbot Logic', outcome: 'Tokenize text data, evaluate sentiment classifiers, and connect conversational prompts.' },
        { week: 'Weeks 13–16', title: 'Ethics, Bias Mitigation & Capstone AI App', outcome: 'Deploy an end-to-end AI application recognizing sign language or assistive speech.' }
      ],
      mentorshipModel: '1-on-1 AI Practitioner explaining mathematical concepts visually without overwhelming calculus.',
      pedagogicalApproach: 'Intuition-first model training: Students understand what happens inside hidden layers before mathematical proofs.',
      certificationTrack: 'Young AI Innovator Certification (Accredited by Global AI STEM Consortium)',
      faqList: [
        { q: 'Is this just prompting ChatGPT or real AI?', a: 'Students train their own actual neural network models using real image and audio datasets, writing code to run inference.' },
        { q: 'What math background is required?', a: 'Pre-algebra is sufficient. We emphasize geometric intuition, coordinate distance, and probabilistic confidence.' }
      ]
    },
    {
      id: 'robotics',
      name: 'Robotics & Virtual IoT Circuits',
      category: 'Hardware & Embedded',
      ageGroup: 'Ages 8–14 (Grades 3–8)',
      level: 'Hands-On Maker',
      icon: <Cpu className="w-5 h-5 text-emerald-500" />,
      description:
        'Bridging virtual logic and physical reality. Students design breadboard circuits, calculate voltage tolerances, and write embedded scripts for simulated microcontrollers.',
      syllabus: [
        'Circuit Basics: Resistors, LEDs, Ohm’s Law & Safe Voltages',
        'Analog vs Digital Sensors: Ultrasonic, Photoresistors & Thermistors',
        'Micro:bit & Arduino Microcontroller Logic with MakeCode & C++',
        'IoT Telemetry, Smart Home Alarms & Autonomous Robot Steering'
      ],
      trialProject: {
        title: 'Smart Ultrasonic Proximity Sentry',
        description:
          'A simulated breadboard circuit that reads distance telemetry and triggers color-coded LED warnings and audio frequency alerts upon proximity intrusion.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['Circuit Schematic Reading', 'Sensor Input/Actuator Output', 'Embedded Logic', 'Systems Safety'],
      tools: ['Tinkercad Circuits', 'BBC micro:bit Simulator', 'MakeCode Block/Python'],
      prerequisites: 'No hardware kit required for trial. Virtual simulator runs directly in the browser; physical kits optionally shipped for enrolled students.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Circuits, Breadboards & Safe Current', outcome: 'Wire parallel and series circuits, calculate resistor values, and avoid short circuits.' },
        { week: 'Weeks 5–8', title: 'Sensors, Actuators & Micro:bit Code', outcome: 'Program light-dependent resistors, temperature gauges, and buzzer musical notes.' },
        { week: 'Weeks 9–12', title: 'Motor Drivers & Autonomous Obstacle Avoidance', outcome: 'Code DC motor H-bridges and simulate two-wheeled smart rovers that steer away from walls.' },
        { week: 'Weeks 13–16', title: 'Smart Home IoT Automation System', outcome: 'Build a simulated connected smart home with automatic night lights and intruder alarms.' }
      ],
      mentorshipModel: '1-on-1 Embedded Systems Mentor guiding circuit debugging wire-by-wire.',
      pedagogicalApproach: 'Safe virtual simulation first, eliminating burnt components while maximizing experimentation speed.',
      certificationTrack: 'Junior IoT & Embedded Systems Specialist Certification',
      faqList: [
        { q: 'Do we need to buy expensive hardware for the trial?', a: 'Not at all! The trial uses browser-based interactive 3D circuit simulators where every wire, LED, and sensor behaves identically to physical hardware.' },
        { q: 'Can students transition to physical microcontrollers?', a: 'Yes! Code written during the class can be flashed directly onto real BBC micro:bit or Arduino hardware via USB.' }
      ]
    },
    {
      id: 'math',
      name: 'Competitive Math & Algorithmic Logic',
      category: 'Analytical Thinking',
      ageGroup: 'Ages 7–15 (Grades 2–9)',
      level: 'Logic & Olympiad Prep',
      icon: <Award className="w-5 h-5 text-rose-500" />,
      description:
        'Cultivating profound mathematical intuition. Beyond rote school memorization, students tackle Olympiad puzzles, graph theory, combinatorics, and cryptographic algorithms.',
      syllabus: [
        'Number Theory, Prime Modular Cycles & Mental Arithmetic Shortcuts',
        'Combinatorics, Permutations & Strategic Game Theory Trees',
        'Spatial Geometry, Transformational Symmetry & Angle Proofs',
        'Cryptographic Ciphers, Modular Arithmetic & Recursion Logic'
      ],
      trialProject: {
        title: 'Caesar Cipher Decoder & Fibonacci Spiral',
        description:
          'Students decrypt hidden mathematical codes using modular arithmetic shifts and program a visual geometric Fibonacci sequence generator.',
        duration: '60 Minutes (Live 1-on-1)'
      },
      skills: ['Mathematical Rigor', 'Deductive Reasoning', 'Pattern Recognition', 'Olympiad Readiness'],
      tools: ['Interactive Graphing', 'Python Math Modules', 'Contest Problem Repository'],
      prerequisites: 'Curiosity about numbers and problem-solving puzzles. Grade-appropriate arithmetic operations.',
      weeklyStructure: [
        { week: 'Weeks 1–4', title: 'Number Theory & Modular Patterns', outcome: 'Explore divisibility rules, prime factorization sieves, and clock arithmetic tricks.' },
        { week: 'Weeks 5–8', title: 'Strategic Combinatorics & Graph Paths', outcome: 'Master tree diagrams, Eulerian path puzzles, and winning game-theory minimax moves.' },
        { week: 'Weeks 9–12', title: 'Visual Geometry & Coordinate Transformations', outcome: 'Solve area dissection paradoxes, rotational symmetries, and Pythagorean models.' },
        { week: 'Weeks 13–16', title: 'Olympiad Challenge Simulations & Proofs', outcome: 'Tackle AMC 8, Math Kangaroo, and Bebras Olympiad problems with speed and confidence.' }
      ],
      mentorshipModel: '1-on-1 Olympiad Medalist & Pure Mathematics Coach nurturing inquisitive reasoning.',
      pedagogicalApproach: 'Socratic questioning: Mentors never give away answers immediately, guiding students to discover mathematical elegance independently.',
      certificationTrack: 'Codeyoung Master of Computational Mathematics & Logic Honours',
      faqList: [
        { q: 'Is this the same as regular school math tutoring?', a: 'No. School often emphasizes repetitive rote calculation. Our curriculum focuses on deep structural logic, contest-level heuristics, and computational thinking.' },
        { q: 'Does this prepare for AMC 8 or Math Kangaroo?', a: 'Yes! Our curriculum is specifically mapped to international math olympiad syllabi.' }
      ]
    }
  ];

  const selectedSubjectData =
    subjects.find((s) => s.id === activeSubjectId) || subjects[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white relative">
      {/* Scroll-Synchronized Horizontal Line (0% to 100%) */}
      <ScrollProgressBar />

      {/* Main Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-100/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 via-indigo-800 to-indigo-950 flex items-center justify-center text-white shadow-md shadow-indigo-950/10">
              <Code2 className="w-5 h-5 text-indigo-200 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-indigo-950 font-serif">
                Codeyoung
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-indigo-500 font-semibold -mt-1">
                Global STEM Academy
              </span>
            </div>
          </a>

          {/* Navigation Links: HOME, TEACHINGS, PARENT REVIEWS */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button
              onClick={handleGoHome}
              className={`hover:text-indigo-600 transition-colors py-2 cursor-pointer ${
                currentTab === 'home' ? 'text-indigo-700 font-bold' : ''
              }`}
            >
              Home
            </button>

            <button
              onClick={handleGoTeachings}
              className={`hover:text-indigo-600 transition-colors py-2 cursor-pointer ${
                currentTab === 'teachings' ? 'text-indigo-700 font-bold' : ''
              }`}
            >
              Teachings
            </button>

            <button
              onClick={handleGoReviews}
              className="hover:text-indigo-600 transition-colors py-2 cursor-pointer"
            >
              Parent Reviews
            </button>
          </nav>

          {/* Action CTAs & Timezone Selector */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <TimezoneSelector variant="header" />

            {isAuthenticated && user ? (
              <Link
                to={
                  user.role === 'ADMIN'
                    ? '/admin/dashboard'
                    : user.role === 'MENTOR'
                    ? '/mentor/dashboard'
                    : '/student/dashboard'
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50/80 px-3.5 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span>My Dashboard</span>
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-700 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              >
                Login
              </Link>
            )}

            <button
              onClick={handleOpenBooking}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Book Free Trial</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <>
            {/* HERO / HOME SECTION (#home) */}
            <section
              id="home"
              className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-indigo-100/60 bg-gradient-to-b from-white via-indigo-50/30 to-slate-50/60"
            >
              {/* Subtle background ambient grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e7ff_1px,transparent_1px),linear-gradient(to_bottom,#e0e7ff_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                  {/* Left Column: Core Value Proposition, Google Ratings & High-Converting CTA */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Dynamic Rotating Brand Inspiration Quote */}
                    <div className="flex justify-start">
                      <DynamicQuoteBanner />
                    </div>

                    {/* Google Ratings & Verified Badge */}
                    <div className="inline-flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-full border border-indigo-100 shadow-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px]">
                          G
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500 ml-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800">4.9 / 5.0 Google Rating</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 font-medium">15,000+ Verified Students</span>
                    </div>

                    {/* Primary Headline */}
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
                      Book a Free 1-on-1 Trial Class with <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-800">
                        Codeyoung.
                      </span>
                    </h1>

                    {/* Subheadline & What is Codeyoung */}
                    <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl">
                      <strong>Codeyoung</strong> is a globally accredited STEM academy providing live, 1-on-1 coding and logic education for children ages 5–17. In your free 60-minute trial session, your child pairs live with an expert instructor and builds a genuine playable project.
                    </p>

                    {/* Primary Call to Action Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                      <button
                        onClick={handleOpenBooking}
                        className="inline-flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base px-8 py-4 rounded-xl shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 focus:ring-4 focus:ring-indigo-200 cursor-pointer"
                      >
                        <span>Book a Free Trial Class</span>
                        <ArrowRight className="w-5 h-5 text-indigo-200" />
                      </button>

                      <button
                        onClick={handleGoTeachings}
                        className="inline-flex items-center justify-center gap-2 bg-white hover:bg-indigo-50/50 border border-indigo-200 text-slate-700 font-semibold text-base px-6 py-4 rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        <span>Explore Teachings & Courses</span>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>

                    {/* Friction-Free Indicators */}
                    <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 border-t border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-medium text-slate-700">100% Free Trial</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-medium text-slate-700">60-Min 1-on-1 Class</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-medium text-slate-700">No Credit Card</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-medium text-slate-700">Live Meeting Link</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Hero Visual - Friendly Girl Learning on Laptop */}
                  <div className="lg:col-span-5">
                    <div className="relative bg-white rounded-3xl border border-indigo-100 shadow-xl shadow-indigo-950/5 p-4 sm:p-5 overflow-hidden">
                      {/* Visual Asset Container */}
                      <div className="relative overflow-hidden rounded-2xl bg-indigo-50/50 aspect-[4/3] border border-indigo-100/60">
                        <img
                          src="/girl-learning-laptop.svg"
                          alt="Professional, friendly young girl smiling and engaged while learning coding on a modern laptop with Codeyoung instructor"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      {/* Trust Reassurance & Quick Booking Bar */}
                      <div className="mt-4 pt-3.5 border-t border-indigo-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>1-on-1 Live Private Class</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-indigo-600 font-semibold">STEM.org Certified</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Interactive coding project tailored for ages 5–17
                          </p>
                        </div>

                        <button
                          onClick={handleOpenBooking}
                          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-600/20 transition-all shrink-0 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Select Time Slot</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

            {/* WHAT IS CODEYOUNG SECTION */}
            <div id="what-is-codeyoung" className="mt-20 pt-16 border-t border-slate-200/90">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  About Our Academy
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                  What is Codeyoung?
                </h2>
                <p className="text-slate-600 mt-3 text-base leading-relaxed">
                  <strong>Codeyoung</strong> is an internationally accredited K–12 STEM academy providing live, 1-on-1 personalized tutoring for young learners ages 5 to 17. We empower children to transition from passive consumers of technology to creative innovators through hands-on learning.
                </p>
              </div>

              {/* 3 Academy Pillars */}
              <div className="grid md:grid-cols-3 gap-6 mb-16">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">1-on-1 Live Private Tutoring</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    No crowded group webinars. Every lesson pairs your child individually with an expert computer science instructor who adapts to their unique learning pace.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Project-First Active Learning</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Children learn by creating genuine, working projects from day one, not by watching passive video tutorials or memorizing definitions.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                    <Award className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">STEM.org Global Accreditation</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Accredited international standard trusted across 10+ countries. Students earn verifiable blockchain certificates recognized for school honors and portfolios.
                  </p>
                </div>
              </div>

              {/* WHY LEARN WITH CODEYOUNG */}
              <div id="academy-advantages" className="pt-8">
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    Why Families Choose Us
                  </span>
                  <h2 className="text-3xl font-extrabold text-slate-900 mt-3 tracking-tight">
                    Why Learn with Codeyoung
                  </h2>
                  <p className="text-slate-600 mt-2 text-sm">
                    Discover why over 15,000 parents trust Codeyoung to build their children's computational thinking, problem-solving, and creative confidence.
                  </p>
                </div>

                {/* 6 Core Advantages Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">1-on-1 Dedicated Attention</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Every session is 100% private. Instructors pace each concept directly to your child's learning speed, addressing questions instantly without peer pressure.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
                      <Rocket className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Build Playable Real Projects</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Zero boring lectures. In their 60-minute trial, students build real arcade games, AI models, or websites they can immediately share with friends and family.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                      <Award className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">STEM.org Global Certification</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Course completion includes internationally accredited STEM credentials and verifiable certificates for school applications and academic honors.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Personalized Learning Pace</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Every session adapts specifically to your child's background, strengths, and creative interests, ensuring they remain constantly inspired and confident.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-4">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">Flexible Scheduling & Rescheduling</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Easily choose slots across all global timezones. Need to reschedule around school exams or activities? Change your session with a single click.
                    </p>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-400 hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">100% Free Trial Zero-Risk Guarantee</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Trial sessions are completely complimentary ($0.00). No credit card required. Parents receive a free comprehensive student learning diagnostic report.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* GOOGLE RATINGS & PARENTS REVIEW SECTION */}
            <div id="testimonials" className="mt-20 pt-16 border-t border-slate-200/90">
              <div className="text-center max-w-3xl mx-auto mb-12">
                {/* Google Ratings Badge */}
                <div className="inline-flex items-center gap-2.5 bg-white px-4 py-1.5 rounded-full border border-indigo-100 shadow-xs mb-3">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                    G
                  </div>
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">4.9 / 5.0 Google Reviews</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-slate-500 font-medium">1,800+ Verified Parent Ratings</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                  What Parents Say About the Free Trial
                </h2>
                <p className="text-slate-600 mt-3 text-base">
                  Real stories from families whose children built genuine, working projects in their complimentary 60-minute trial session.
                </p>
              </div>

              {/* 3 Detailed Parent Testimonial Cards */}
              <div className="grid md:grid-cols-3 gap-8 items-stretch">
                {/* Testimonial 1 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400" />
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1.5">5.0 / 5.0</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Google Verified
                      </span>
                    </div>

                    <div className="relative mb-6">
                      <Quote className="w-6 h-6 text-slate-200 absolute -top-1 -left-1 pointer-events-none" />
                      <p className="text-sm text-slate-600 leading-relaxed relative z-10 pl-3">
                        “Oliver had never written a single line of code before. In 60 minutes with his 1-on-1 instructor, he learned how core logic loops work and built his very own playable arcade game. Seeing his pride when he shared the project link with his grandparents was priceless.”
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Sarah Jenkins</h4>
                      <p className="text-xs text-slate-500">
                        Parent of <span className="font-semibold text-slate-700">Oliver</span> (Age 9, Grade 4)
                      </p>
                    </div>
                    <span className="text-xs text-amber-500 font-bold">★★★★★</span>
                  </div>
                </div>

                {/* Testimonial 2 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400" />
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1.5">5.0 / 5.0</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Google Verified
                      </span>
                    </div>

                    <div className="relative mb-6">
                      <Quote className="w-6 h-6 text-slate-200 absolute -top-1 -left-1 pointer-events-none" />
                      <p className="text-sm text-slate-600 leading-relaxed relative z-10 pl-3">
                        “I was skeptical about how much could realistically be accomplished in a trial class. The instructor broke down computational thinking so cleanly that Maya built a functioning terminal adventure quest from scratch. She immediately asked when her next lesson was.”
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">David Chen</h4>
                      <p className="text-xs text-slate-500">
                        Parent of <span className="font-semibold text-slate-700">Maya</span> (Age 12, Grade 7)
                      </p>
                    </div>
                    <span className="text-xs text-amber-500 font-bold">★★★★★</span>
                  </div>
                </div>

                {/* Testimonial 3 */}
                <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-400" />
                        ))}
                        <span className="text-xs font-bold text-slate-800 ml-1.5">5.0 / 5.0</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        Google Verified
                      </span>
                    </div>

                    <div className="relative mb-6">
                      <Quote className="w-6 h-6 text-slate-200 absolute -top-1 -left-1 pointer-events-none" />
                      <p className="text-sm text-slate-600 leading-relaxed relative z-10 pl-3">
                        “The 1-on-1 format made all the difference. Instead of a pre-recorded video or crowded group room, the instructor answered every single one of Ethan's questions in real-time. By the end of the hour, he had built an interactive animated web project with custom clickable cards.”
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Rebecca Thornton</h4>
                      <p className="text-xs text-slate-500">
                        Parent of <span className="font-semibold text-slate-700">Ethan</span> (Age 8, Grade 3)
                      </p>
                    </div>
                    <span className="text-xs text-amber-500 font-bold">★★★★★</span>
                  </div>
                </div>
              </div>

              {/* Bottom Call to action inside review section */}
              <div className="mt-12 p-6 bg-slate-900 text-white rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">
                    <span>★★★★★</span>
                    <span>100% Free Trial Class</span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">No Credit Card Needed</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Ready to see what your child will build in their first 60 minutes?
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Book a complimentary 1-on-1 session with our expert educators today.
                  </p>
                </div>
                <button
                  onClick={handleOpenBooking}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 shrink-0 flex items-center gap-2 cursor-pointer"
                >
                  <span>Book Free 1-on-1 Trial</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    )}

    {currentTab === 'teachings' && (
      <section id="teachings" className="py-16 sm:py-20 bg-slate-50 min-h-[85vh] border-b border-indigo-100/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="max-w-5xl mx-auto mb-10 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
              Codeyoung STEM Academy · All Available Courses
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Our Teaching Programs & Course Curriculum
            </h2>
          </div>

          {/* 1. Short 5-Line Intro Box */}
          <div className="bg-white rounded-2xl border border-indigo-100/90 p-6 sm:p-8 shadow-xs max-w-5xl mx-auto mb-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-4 pb-3 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Teaching Philosophy & Academy Overview</span>
            </div>
            <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
              <p className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Codeyoung is an internationally accredited 1-on-1 STEM academy empowering young minds ages 5–17 to master computer science, algorithmic logic, and artificial intelligence.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Every student learns through an individual learning pace tailored to their cognitive readiness, guided by vetted mentors from top tech institutions.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Our project-first pedagogy transitions children from passive digital screen consumers into inventive software and hardware creators.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  Students gain industry-standard computational thinking, algorithmic rigor, and official STEM.org accredited certificates for academic milestones.
                </span>
              </p>
              <p className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  5
                </span>
                <span>
                  In your complimentary 60-minute trial session, your child pairs live with an expert educator to code and take home a fully working playable project.
                </span>
              </p>
            </div>
          </div>

          {/* 2. Large High-Converting Free Trial Booking Box */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border-2 border-indigo-500/30 max-w-5xl mx-auto mb-14 relative overflow-hidden">
            {/* Background ambient accents */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-8 border-b border-slate-800">
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-400/30">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>COMPLIMENTARY 60-MINUTE 1-ON-1 TRIAL SESSION</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                    Book a Free 1-on-1 Trial in Any Subject
                  </h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    Experience 60 minutes of live, private guidance with an expert educator. Your child will write real code and build an original playable project saved directly to your cloud portfolio.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                  <button
                    onClick={handleOpenBooking}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-base px-8 py-4 rounded-xl shadow-xl shadow-indigo-600/40 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <span>Book Free 1-on-1 Trial</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <span className="text-[11px] text-center text-slate-400 font-medium">
                    100% Free · No credit card required · Instant confirmation
                  </span>
                </div>
              </div>

              {/* 4 Large Highlights inside Free Trial Box */}
              <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-xs text-slate-200">
                <div className="bg-white/5 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-white text-sm">100% Free ($0.00)</div>
                  <p className="text-slate-400 text-xs mt-1.5 leading-snug">
                    Zero payment info or credit card needed to attend your trial.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-white text-sm">60-Min 1-on-1 Class</div>
                  <p className="text-slate-400 text-xs mt-1.5 leading-snug">
                    Dedicated instructor tailored exclusively to your child.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-3">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-white text-sm">Playable Project</div>
                  <p className="text-slate-400 text-xs mt-1.5 leading-snug">
                    Build an authentic playable arcade game, web app, or AI model.
                  </p>
                </div>

                <div className="bg-white/5 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-white/10">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-white text-sm">Your Local Time</div>
                  <p className="text-slate-400 text-xs mt-1.5 leading-snug">
                    Classes automatically synchronized to {timezone}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Quick Navigation to All 6 Available Courses */}
          <div className="max-w-5xl mx-auto mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 px-1">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  All Available Courses (6 Accredited Tracks)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any course badge to jump directly to its complete curriculum and trial details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {subjects.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    const el = document.getElementById(`course-${item.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="p-3 bg-white hover:bg-blue-50 hover:border-blue-300 border border-slate-200 rounded-xl text-left shadow-2xs transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 group-hover:bg-white flex items-center justify-center border border-slate-100">
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700 leading-snug line-clamp-2">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium mt-1">
                      {item.ageGroup.split(' ')[0]}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Complete Details for ALL Available Courses */}
          <div className="space-y-12 max-w-5xl mx-auto">
            {subjects.map((course, index) => (
              <div
                key={course.id}
                id={`course-${course.id}`}
                className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 lg:p-10 shadow-sm scroll-mt-24"
              >
                {/* Course Header with Badges & CTAs */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                      {course.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                          Course {index + 1} of 6
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {course.category}
                        </span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                        {course.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                          {course.ageGroup}
                        </span>
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          {course.level}
                        </span>
                        <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          60-Min Free Trial
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenBookingWithSubject(course.name)}
                    className="inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md shadow-blue-700/20 transition-all shrink-0 cursor-pointer"
                  >
                    <span>Book Free Trial for This Course</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Course Overview & Prerequisites */}
                <div className="mt-6 grid md:grid-cols-12 gap-4">
                  <div className="md:col-span-8 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Course Overview & Philosophy
                    </span>
                    <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
                      {course.description}
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <span><strong>Mentorship Model:</strong> {course.mentorshipModel}</span>
                    </div>
                  </div>

                  <div className="md:col-span-4 p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Prerequisites
                      </span>
                      <p className="text-slate-700 text-xs leading-relaxed">
                        {course.prerequisites}
                      </p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-xs text-emerald-800">
                      <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-semibold text-[11px] leading-tight">{course.certificationTrack}</span>
                    </div>
                  </div>
                </div>

                {/* Two Column Detailed Breakdown: Curriculum vs Free Trial Project */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                  {/* Left: Complete Curriculum Modules & 16-Week Progression */}
                  <div className="space-y-6">
                    {/* Curriculum Modules */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>Curriculum Modules & Core Milestones</span>
                      </span>
                      <div className="space-y-2.5">
                        {course.syllabus.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 16-Week Progression Structure */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>16-Week Learning Roadmap & Student Outcomes</span>
                      </span>
                      <div className="space-y-3">
                        {course.weeklyStructure.map((ws, idx) => (
                          <div key={idx} className="text-xs bg-white p-3 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                              <span className="text-blue-700 font-mono text-[11px]">{ws.week}</span>
                              <span className="text-slate-800">{ws.title}</span>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">
                              {ws.outcome}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: 60-Minute Trial Project Box & Key Skills */}
                  <div className="space-y-6">
                    {/* Trial Project Box */}
                    <div className="bg-gradient-to-b from-blue-50/50 to-white p-6 rounded-2xl border-2 border-blue-600/30 shadow-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                            Build In Free Trial Class
                          </span>
                          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            60-Min 1-on-1 Class
                          </span>
                        </div>

                        <h4 className="text-lg font-extrabold text-slate-900 mt-2">
                          {course.trialProject.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                          {course.trialProject.description}
                        </p>

                        <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5 shadow-2xs">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            <span>What happens in this 60-min trial?</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Live 1-on-1 private guidance with a vetted STEM educator</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Hands-on step-by-step logic assembly and interactive testing</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>Fully functioning playable project saved to your account</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <span className="text-emerald-700 font-bold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          Playable Link to Keep Forever
                        </span>
                        <button
                          onClick={() => handleOpenBookingWithSubject(course.name)}
                          className="w-full sm:w-auto bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>Reserve Free Slot</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Competencies & Tools */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          Key Competencies Developed:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {course.skills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-white text-blue-700 font-medium px-2.5 py-1 rounded-lg border border-blue-100 shadow-2xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-200">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          Tools & Platforms Used:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {course.tools.map((t, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-white text-slate-800 font-mono px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Course FAQ */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-3">
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>Frequently Asked About {course.name}</span>
                      </span>
                      <div className="space-y-3">
                        {course.faqList.map((faq, idx) => (
                          <div key={idx} className="text-xs bg-white p-3 rounded-xl border border-slate-200/80">
                            <div className="font-bold text-slate-900 mb-1">Q: {faq.q}</div>
                            <p className="text-slate-600 leading-relaxed">A: {faq.a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Book Free Trial Banner */}
          <div className="mt-14 max-w-5xl mx-auto rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-slate-800 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>ZERO-COMMITMENT 1-ON-1 TRIAL · COMPLIMENTARY 60 MINUTES</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Ready to Start Your Child's STEM Journey?
                </h3>
                <p className="text-slate-300 text-sm mt-1 max-w-xl">
                  Choose any course above and let your child experience a 1-on-1 private lesson with an expert instructor.
                </p>
              </div>

              <button
                onClick={handleOpenBooking}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm px-8 py-4 rounded-xl transition-all shadow-lg shadow-indigo-600/30 shrink-0 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Book Free Trial Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust Guarantees */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Free ($0.00)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No Credit Card</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>60-Min 1-on-1 Class</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Playable Project to Keep</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    )}
      </main>

      {/* Booking Modal / Dialog */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-indigo-950 text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-mono tracking-wider text-indigo-300 font-semibold">
                  Free 1-on-1 Trial Class
                </span>
                <h3 className="text-lg font-bold text-white">
                  {isBooked
                    ? 'Trial Class Confirmed!'
                    : `Step ${step} of 3: ${
                        step === 1
                          ? 'Student Details'
                          : step === 2
                          ? 'Parent Details'
                          : 'Schedule (Timezone & Slot)'
                      }`}
                </h3>
              </div>
              <button
                onClick={() => setIsBookingOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-indigo-900 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress - Exactly 3 Steps */}
            {!isBooked && (
              <div className="bg-indigo-50/60 px-6 py-3 border-b border-indigo-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span className={step >= 1 ? 'text-indigo-700 font-bold' : ''}>1. Student</span>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-300" />
                <span className={step >= 2 ? 'text-indigo-700 font-bold' : ''}>2. Parent</span>
                <ChevronRight className="w-3.5 h-3.5 text-indigo-300" />
                <span className={step >= 3 ? 'text-indigo-700 font-bold' : ''}>3. Schedule</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6">
              {isBooked ? (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h4 className="text-2xl font-bold text-slate-900">Your Trial Class is Reserved</h4>
                  <p className="text-sm text-slate-600 max-w-md mx-auto">
                    We have reserved a dedicated 1-on-1 trial slot for{' '}
                    <strong>{confirmedBooking?.student.name || studentName || 'your child'}</strong> on <strong>{selectedDate}</strong> at{' '}
                    <strong>
                      {selectedSlotData
                        ? `${selectedSlotData.formattedTime} (${selectedSlotData.timezone})`
                        : `${selectedSlot} (${timezone})`}
                    </strong>
                    .
                  </p>

                  <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100 text-left text-xs space-y-2 mt-4 font-mono text-slate-800">
                    <div>
                      <strong>Booking Reference:</strong>{' '}
                      <span className="text-indigo-700 font-bold">{confirmedBooking?.bookingId || 'BK-1024'}</span>
                    </div>
                    <div>
                      <strong>Subject:</strong> {confirmedBooking?.student.subject || subject}
                    </div>
                    <div>
                      <strong>Meeting Link:</strong>{' '}
                      <span className="text-indigo-600 break-all font-semibold">
                        {confirmedBooking?.meetingLink || 'https://demo.codeyoung.com/class/BK-1024'}
                      </span>
                    </div>
                    <div>
                      <strong>Confirmation Sent To:</strong> {confirmedBooking?.parent.email || parentEmail || 'your email'}
                    </div>
                    <div>
                      <strong>Class Format:</strong> Live 1-on-1 private lesson with customized project
                    </div>
                  </div>

                  <button
                    onClick={() => setIsBookingOpen(false)}
                    className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleNextStep} className="space-y-4">
                  {step === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Student Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="e.g. Leo Parker"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Grade / Age *
                        </label>
                        <select
                          value={studentGrade}
                          onChange={(e) => setStudentGrade(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                        >
                          <option>Grade 1 - 3 (Ages 6-8)</option>
                          <option>Grade 4 - 5 (Ages 9-10)</option>
                          <option>Grade 6 - 8 (Ages 11-13)</option>
                          <option>Grade 9 - 12 (Ages 14-17)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Subject Area *
                        </label>
                        <select
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white"
                        >
                          <option>Scratch & Creative Coding</option>
                          <option>Python & Game Architecture</option>
                          <option>Full-Stack Web Development & Apps</option>
                          <option>Artificial Intelligence & Machine Learning</option>
                          <option>Robotics & Virtual IoT Circuits</option>
                          <option>Competitive Math & Algorithmic Logic</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Optional Learning Goal
                        </label>
                        <input
                          type="text"
                          value={learningGoal}
                          onChange={(e) => setLearningGoal(e.target.value)}
                          placeholder="e.g. Wants to build games like Minecraft or Roblox"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Parent Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          placeholder="e.g. Sarah Parker"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Parent Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={parentEmail}
                          onChange={(e) => setParentEmail(e.target.value)}
                          placeholder="e.g. sarah.parker@example.com"
                          className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Class joining link and calendar invite will be sent to this email.
                        </p>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-4">
                      {/* Integrated Timezone & Date Row */}
                      <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                              Parent Timezone
                            </label>
                            <TimezoneSelector variant="header" className="w-full" />
                          </div>

                          <div className="sm:w-48">
                            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-950 mb-1">
                              Trial Date
                            </label>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => setSelectedDate(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white text-slate-800 cursor-pointer"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-600">
                          Times automatically adjust to <strong>{timezoneDetails.label}</strong> ({timezone}). Select your preferred 60-minute session below.
                        </p>
                      </div>

                      {/* Available Slots Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                            Available 60-Min Slots on {selectedDate}
                          </label>
                          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                            {timezoneDetails.shortName} Local Time
                          </span>
                        </div>

                        {isLoadingSlots ? (
                          <div className="py-10 flex flex-col items-center justify-center text-slate-500 space-y-2.5 border border-dashed border-indigo-200 rounded-xl bg-indigo-50/30">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                            <p className="text-xs font-medium text-slate-600">
                              Finding available trial times...
                            </p>
                          </div>
                        ) : slotsError ? (
                          <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl text-center space-y-2.5">
                            <p className="text-xs text-red-700 font-medium">{slotsError}</p>
                            <button
                              type="button"
                              onClick={() => loadSlots(selectedDate, timezone)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Retry</span>
                            </button>
                          </div>
                        ) : slots.filter((s) => s.status !== 'FULL' && s.availableMentors > 0).length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                            <p className="text-xs text-slate-600 font-medium max-w-sm mx-auto">
                              No trial times available for this date. Let&apos;s select another date.
                            </p>
                            <div className="flex justify-center pt-1">
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-600 focus:outline-none bg-white font-medium cursor-pointer"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-xs max-h-60 overflow-y-auto pr-0.5">
                            {slots.map((slot) => {
                              const formatted = formatSlotRange(slot.startTime, slot.endTime, timezone);
                              const isSelected = selectedSlotData?.startTime === slot.startTime;
                              const isFull = slot.status === 'FULL' || slot.availableMentors === 0;
                              const isLimited = slot.status === 'LIMITED';

                              return (
                                <button
                                  key={slot.startTime}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => {
                                    if (!isFull) {
                                      setSelectedSlotData({
                                        startTime: slot.startTime,
                                        endTime: slot.endTime,
                                        timezone: timezone,
                                        formattedTime: formatted,
                                      });
                                      setSelectedSlot(formatted);
                                    }
                                  }}
                                  className={`p-3 rounded-xl border text-left font-medium transition-all ${
                                    isFull
                                      ? 'border-slate-200 bg-slate-50/70 text-slate-400 cursor-not-allowed opacity-60'
                                      : isSelected
                                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold ring-2 ring-indigo-600/20 shadow-xs'
                                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/20 text-slate-700 cursor-pointer'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={isFull ? 'line-through text-slate-400' : ''}>
                                      {formatted}
                                    </span>
                                  </div>
                                  {isFull ? (
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                      ● Fully booked
                                    </div>
                                  ) : isLimited ? (
                                    <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                                      ● Limited ({slot.availableMentors}{' '}
                                      {slot.availableMentors === 1 ? 'spot' : 'spots'} left)
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                      ● 1-on-1 trial slot available
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Summary Review */}
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Student:</span>
                          <span className="font-semibold text-slate-800">{studentName || 'Not specified'} ({studentGrade})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Parent:</span>
                          <span className="font-semibold text-slate-800">{parentName || 'Not specified'} ({parentEmail || 'Not specified'})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Subject:</span>
                          <span className="font-semibold text-indigo-700">{subject}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Selected Slot:</span>
                          <span className="font-bold text-indigo-900">
                            {selectedSlotData
                              ? `${selectedSlotData.formattedTime} (${selectedSlotData.timezone})`
                              : 'None selected yet'}
                          </span>
                        </div>
                      </div>

                      {bookingError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                          {bookingError}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={() => setStep(step - 1)}
                        disabled={isSubmittingBooking}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 cursor-pointer disabled:opacity-50"
                      >
                        Back
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="submit"
                      disabled={step === 3 && (!selectedSlotData || isLoadingSlots || isSubmittingBooking)}
                      className={`font-semibold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer ${
                        step === 3 && (!selectedSlotData || isLoadingSlots || isSubmittingBooking)
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
                      }`}
                    >
                      {isSubmittingBooking && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{step === 3 ? (isSubmittingBooking ? 'Confirming...' : 'Confirm Free Trial') : 'Continue'}</span>
                      {!isSubmittingBooking && <ArrowRight className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-white text-base">Codeyoung</span>
            <span>© 2026 Codeyoung. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={handleGoHome} className="hover:text-white transition-colors">
              Home
            </button>
            <button onClick={handleGoTeachings} className="hover:text-white transition-colors">
              Teachings
            </button>
            <button onClick={handleGoReviews} className="hover:text-white transition-colors">
              Parent Reviews
            </button>
            <button
              onClick={handleOpenBooking}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
