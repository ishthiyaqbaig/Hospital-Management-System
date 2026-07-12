import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { getRoleRedirect } from "../utils/roles";

const performanceData = [
  { label: "08:00 AM", load: 12 },
  { label: "10:00 AM", load: 45 },
  { label: "12:00 PM", load: 78 },
  { label: "02:00 PM", load: 60 },
  { label: "04:00 PM", load: 88 },
  { label: "06:00 PM", load: 42 },
];

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();

  const getLaunchLink = () => {
    if (isAuthenticated && user) {
      return getRoleRedirect(user.role);
    }
    return "/login";
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-medical-navy via-medical-blue to-medical-teal p-8 md:p-12 text-white shadow-soft">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl"></div>
        <div className="absolute left-0 bottom-0 -ml-20 -mb-20 h-80 w-80 rounded-full bg-medical-mint/20 blur-3xl"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-medical-mint/25 px-3 py-1 text-xs font-semibold tracking-wide text-medical-mint border border-medical-mint/30">
            ✨ Next-Gen Healthcare intelligence
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl lg:text-6xl">
            MediFlow AI
          </h1>
          <p className="text-lg md:text-xl text-cyan-50/90 leading-relaxed font-normal">
            An intelligent, HIPAA-secure clinical platform powered by Google Gemini. Streamline patient triage, consult schedules, electronic prescriptions, and real-time hospital operations.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to={getLaunchLink()}
              className="rounded-xl bg-white hover:bg-cyan-50 transition text-medical-navy px-6 py-3.5 text-sm font-bold shadow-md hover:scale-102 transform duration-200"
            >
              Launch Console
            </Link>
            <Link
              to="/health"
              className="rounded-xl border border-white/40 hover:border-white hover:bg-white/10 transition text-white px-6 py-3.5 text-sm font-semibold"
            >
              System Health
            </Link>
          </div>
        </div>
      </section>

      {/* Grid: Live Analytics & Feature Highlight */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Features Showcase */}
        <section className="space-y-6">
          <div className="border-b border-cyan-100 pb-3">
            <h2 className="text-2xl font-bold text-medical-navy">Intelligent Clinical Modules</h2>
            <p className="text-sm text-slate-500 mt-1">Four core modules built to empower patients and hospital workers alike.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FeatureCard
              title="AI Emergency Triage"
              desc="Analyzes emergency symptoms using LLMs to automatically prioritize waiting lists by medical urgency."
              icon="⚡"
            />
            <FeatureCard
              title="Doctor Consultation Hub"
              desc="Allows doctors to write prescriptions, query comprehensive patient histories, and view AI-summarized briefs."
              icon="🩺"
            />
            <FeatureCard
              title="HIPAA Security Shield"
              desc="Secures medical histories, prescription lists, and client documents via strict role-based access tokens."
              icon="🔒"
            />
            <FeatureCard
              title="Interactive Front Desk"
              desc="Manages department queues, schedules appointments, and handles notifications seamlessly."
              icon="🏢"
            />
          </div>
        </section>

        {/* Live System load chart */}
        <section className="rounded-2xl border border-cyan-100 bg-white p-6 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-medical-navy">Console Activity Load</h3>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 animate-pulse flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Live Status
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Real-time tracker of server requests across different time slots.</p>
          </div>

          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData} margin={{ left: -28, right: 8, top: 10 }}>
                <CartesianGrid stroke="#ecfeff" strokeDasharray="4 4" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="load"
                  stroke="#0891b2"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#0e7490", strokeWidth: 2 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Demo Credentials Section */}
      <section className="rounded-2xl border border-cyan-100 bg-medical-ice p-6 md:p-8 space-y-6">
        <div>
          <h3 className="text-xl font-bold text-medical-navy">Quick-Start Sandbox Accounts</h3>
          <p className="text-sm text-slate-600 mt-1">Sign in with any of the demo accounts below to experience different perspective modules.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DemoAccountCard role="Patient" email="patient@mediflow.ai" pass="Patient1234" features="Book slots, view prescriptions, request PDFs" color="teal" />
          <DemoAccountCard role="Doctor" email="doctor@mediflow.ai" pass="Doctor1234" features="Complete consults, write prescriptions, view AI summaries" color="cyan" />
          <DemoAccountCard role="Receptionist" email="reception@mediflow.ai" pass="Reception1234" features="Perform AI triage, manage queue status, book walk-ins" color="amber" />
          <DemoAccountCard role="Administrator" email="admin@mediflow.ai" pass="Admin1234" features="Monitor system performance, generate reports, view directory" color="purple" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, desc, icon }) {
  return (
    <div className="rounded-xl border border-cyan-100 bg-white p-5 shadow-sm hover:shadow-soft hover:border-cyan-200 transition transform hover:-translate-y-0.5 duration-200 space-y-3">
      <div className="text-3xl">{icon}</div>
      <div>
        <h4 className="font-bold text-medical-navy text-base">{title}</h4>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function DemoAccountCard({ role, email, pass, features, color }) {
  const getBadgeColor = () => {
    switch (color) {
      case "cyan":
        return "bg-cyan-50 border-cyan-200 text-cyan-700";
      case "amber":
        return "bg-amber-50 border-amber-200 text-amber-700";
      case "purple":
        return "bg-purple-50 border-purple-200 text-purple-700";
      default:
        return "bg-teal-50 border-teal-200 text-teal-700";
    }
  };

  return (
    <div className="rounded-xl bg-white border border-cyan-100 p-5 space-y-4 hover:shadow-soft transition">
      <div className="flex justify-between items-center">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${getBadgeColor()}`}>
          {role}
        </span>
        <span className="text-slate-300">🔑</span>
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-400">Email:</span>
          <span className="font-bold text-slate-700">{email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Password:</span>
          <span className="font-semibold text-slate-700">{pass}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-cyan-50 pt-3">
        <p className="text-[10px] text-slate-500 leading-normal italic">
          <strong>Access:</strong> {features}
        </p>
      </div>
    </div>
  );
}
