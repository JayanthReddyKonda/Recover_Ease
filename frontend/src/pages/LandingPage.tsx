import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ArrowRight, Shield, Brain, Activity, BarChart3, Bell, Users, CheckCircle, Star, ChevronRight, Zap } from "lucide-react";
import Button from "@/components/Button";
import { FadeIn } from "@/components/motion";

const features = [
    {
        icon: <Activity className="h-5 w-5" />,
        title: "Daily Symptom Logging",
        desc: "Log pain, mood, energy, sleep & more with intuitive sliders. Voice input supported.",
        gradient: "from-blue-500 to-cyan-400",
        shadow: "shadow-[0_4px_20px_rgb(59_130_246_/_0.25)]",
    },
    {
        icon: <Brain className="h-5 w-5" />,
        title: "AI-Powered Insights",
        desc: "Groq LLM analyzes trends and warning signs in real time, giving personalized guidance.",
        gradient: "from-violet-500 to-purple-400",
        shadow: "shadow-[0_4px_20px_rgb(139_92_246_/_0.25)]",
    },
    {
        icon: <Shield className="h-5 w-5" />,
        title: "Automatic Escalations",
        desc: "Critical metrics trigger instant alerts to your doctor. Never miss a warning sign.",
        gradient: "from-red-500 to-rose-400",
        shadow: "shadow-[0_4px_20px_rgb(239_68_68_/_0.25)]",
    },
    {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Visual Trend Charts",
        desc: "Track your recovery with beautiful 7/14/30-day trend charts and pain heatmaps.",
        gradient: "from-emerald-500 to-teal-400",
        shadow: "shadow-[0_4px_20px_rgb(16_185_129_/_0.25)]",
    },
    {
        icon: <Bell className="h-5 w-5" />,
        title: "Real-Time Notifications",
        desc: "WebSocket-powered live alerts keep doctors and patients connected instantly.",
        gradient: "from-amber-500 to-orange-400",
        shadow: "shadow-[0_4px_20px_rgb(245_158_11_/_0.25)]",
    },
    {
        icon: <Users className="h-5 w-5" />,
        title: "Doctor-Patient Portal",
        desc: "Doctors manage patients, review logs, acknowledge escalations — all in one place.",
        gradient: "from-indigo-500 to-blue-400",
        shadow: "shadow-[0_4px_20px_rgb(99_102_241_/_0.25)]",
    },
];

const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "<200ms", label: "Response Time" },
    { value: "256-bit", label: "Encryption" },
    { value: "24/7", label: "Monitoring" },
];

const ease = [0.22, 1, 0.36, 1] as const;

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col" style={{ background: "#0d1117" }}>
            {/* ─── Navbar ─────────────────────────────── */}
            <nav className="sticky top-0 z-50" style={{ background: "rgba(13,17,23,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link to="/" className="flex items-center gap-2.5 font-bold text-[15px] text-white">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 16px rgb(99 102 241 / 0.4)" }}>
                            <Heart className="h-4 w-4 fill-white text-white" />
                        </div>
                        RecoverEase
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <button className="rounded-xl px-4 py-2 text-sm font-medium text-white/60 transition-colors hover:text-white">
                                Log in
                            </button>
                        </Link>
                        <Link to="/register">
                            <button className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 0 16px rgb(99 102 241 / 0.35)" }}>
                                Get Started
                            </button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ───────────────────────────────── */}
            <section className="relative flex flex-col items-center overflow-hidden px-6 pt-24 pb-28 text-center">
                {/* animated blobs */}
                <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full opacity-20 animate-blob" style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(80px)" }} />
                <div className="pointer-events-none absolute top-40 -right-40 h-[400px] w-[400px] rounded-full opacity-15 animate-blob-delay" style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)", filter: "blur(80px)" }} />
                <div className="pointer-events-none absolute top-20 -left-40 h-[350px] w-[350px] rounded-full opacity-10 animate-blob" style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 70%)", filter: "blur(80px)", animationDelay: "6s" }} />
                {/* grid */}
                <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(to right, rgba(99,102,241,0.05) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                {/* fade bottom */}
                <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32" style={{ background: "linear-gradient(to top, #0d1117, transparent)" }} />

                <div className="relative mx-auto max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-primary-300 ring-1 ring-inset ring-primary-500/30"
                        style={{ background: "rgba(99,102,241,0.1)" }}
                    >
                        <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        AI-Powered Post-Discharge Monitoring
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1, ease }}
                        className="text-5xl font-black leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl"
                    >
                        Your Recovery,{" "}
                        <span style={{ background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 40%, #c4b5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            Intelligently
                        </span>
                        <br />
                        <span className="text-white">Guided</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.25, ease }}
                        className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/55"
                    >
                        Track symptoms, receive AI-powered insights, and stay connected
                        with your care team — all from one beautiful, secure dashboard.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.38, ease }}
                        className="mt-10 flex flex-wrap justify-center gap-4"
                    >
                        <Link to="/register">
                            <button className="group inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-semibold text-white transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 0 32px rgb(99 102 241 / 0.4), 0 4px 16px rgb(0 0 0 / 0.3)" }}>
                                Start Free
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </Link>
                        <Link to="/login">
                            <button className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-medium text-white/70 transition-all duration-200 hover:text-white hover:bg-white/8 active:scale-[0.98]" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
                                Log in <ChevronRight className="h-4 w-4" />
                            </button>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.52, ease }}
                        className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40"
                    >
                        {["HIPAA-Ready", "End-to-End Encrypted", "No Credit Card"].map((t) => (
                            <span key={t} className="flex items-center gap-1.5">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {t}
                            </span>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ─── Stats Bar ─────────────────────────── */}
            <section className="py-12" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-around gap-8 px-6 text-center">
                    {stats.map((s, i) => (
                        <FadeIn key={s.label} delay={i * 0.08}>
                            <p className="text-3xl font-black text-white">{s.value}</p>
                            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-white/35">{s.label}</p>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── Features Grid ─────────────────────── */}
            <section className="mx-auto max-w-6xl px-6 py-28">
                <FadeIn className="mx-auto mb-16 max-w-2xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary-400">Features</p>
                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                        Everything for a smooth recovery
                    </h2>
                    <p className="mt-4 text-lg text-white/45">
                        Built for patients and doctors alike — powerful tools wrapped in simplicity.
                    </p>
                </FadeIn>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((f, i) => (
                        <FadeIn key={f.title} delay={i * 0.07}>
                            <div
                                className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                            >
                                {/* hover gradient flare */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ background: "radial-gradient(ellipse at top left, rgba(99,102,241,0.12) 0%, transparent 60%)" }} />
                                <div className={`relative mb-4 inline-flex rounded-xl bg-gradient-to-br ${f.gradient} ${f.shadow} p-2.5 text-white`}>
                                    {f.icon}
                                </div>
                                <h3 className="relative text-[15px] font-semibold text-white">{f.title}</h3>
                                <p className="relative mt-2 text-sm leading-relaxed text-white/45">{f.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── CTA ───────────────────────────────── */}
            <section className="py-28" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <FadeIn className="mx-auto max-w-3xl px-6 text-center">
                    <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg, #6366f1, #7c3aed)", boxShadow: "0 0 32px rgb(99 102 241 / 0.4)" }}>
                        <Zap className="h-6 w-6 text-white fill-white" />
                    </div>
                    <div className="mx-auto mb-6 flex justify-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                    </div>
                    <blockquote className="text-xl font-medium leading-relaxed text-white/70 italic">
                        &ldquo;RecoverEase made my post-surgery journey so much less stressful.
                        The AI insights caught a warning sign my doctor confirmed — it genuinely
                        helped my recovery.&rdquo;
                    </blockquote>
                    <p className="mt-4 text-sm text-white/35">— Sarah K., knee replacement patient</p>

                    <div className="mt-12">
                        <Link to="/register">
                            <button className="group inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]" style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", boxShadow: "0 0 40px rgb(99 102 241 / 0.45), 0 8px 24px rgb(0 0 0 / 0.3)" }}>
                                Start your free account
                                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </button>
                        </Link>
                    </div>
                </FadeIn>
            </section>

            {/* ─── Footer ──────────────────────────── */}
            <footer className="py-8 text-center text-xs text-white/20" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                © {new Date().getFullYear()} RecoverEase. Built with care.
            </footer>
        </div>
    );
}
