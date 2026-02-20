import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ArrowRight, Shield, Brain, Activity, BarChart3, Bell, Users, CheckCircle, Star } from "lucide-react";
import Button from "@/components/Button";
import { FadeIn } from "@/components/motion";

const features = [
    {
        icon: <Activity className="h-5 w-5" />,
        title: "Daily Symptom Logging",
        desc: "Log pain, mood, energy, sleep & more with intuitive sliders. Voice input supported.",
        color: "from-blue-500 to-cyan-400",
    },
    {
        icon: <Brain className="h-5 w-5" />,
        title: "AI-Powered Insights",
        desc: "Groq LLM analyzes trends and warning signs in real time, giving personalized tips.",
        color: "from-purple-500 to-pink-400",
    },
    {
        icon: <Shield className="h-5 w-5" />,
        title: "Automatic Escalations",
        desc: "Critical metrics trigger instant alerts to your doctor. Never miss a warning sign.",
        color: "from-red-500 to-orange-400",
    },
    {
        icon: <BarChart3 className="h-5 w-5" />,
        title: "Visual Trend Charts",
        desc: "Track your recovery with beautiful 7/14/30 day trend charts and pain heatmaps.",
        color: "from-emerald-500 to-teal-400",
    },
    {
        icon: <Bell className="h-5 w-5" />,
        title: "Real-Time Notifications",
        desc: "WebSocket-powered live alerts keep doctors and patients connected instantly.",
        color: "from-amber-500 to-yellow-400",
    },
    {
        icon: <Users className="h-5 w-5" />,
        title: "Doctor-Patient Portal",
        desc: "Doctors manage patients, review logs, acknowledge escalations — all in one dashboard.",
        color: "from-indigo-500 to-blue-400",
    },
];

const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "<200ms", label: "Response Time" },
    { value: "256-bit", label: "Encryption" },
    { value: "24/7", label: "Monitoring" },
];

const ease = [0.25, 0.1, 0.25, 1] as const;

export default function LandingPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white">
            {/* ─── Navbar ─────────────────────────────── */}
            <nav className="sticky top-0 z-50 border-b border-gray-100/60 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                    <Link to="/" className="flex items-center gap-2.5 font-bold text-lg text-gray-900">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white shadow-glow-sm">
                            <Heart className="h-[18px] w-[18px] fill-white" />
                        </div>
                        Recovery
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link to="/login">
                            <Button variant="ghost" size="sm">Log in</Button>
                        </Link>
                        <Link to="/register">
                            <Button size="sm">Get Started <ArrowRight className="h-3.5 w-3.5" /></Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ─── Hero ───────────────────────────────── */}
            <section className="relative overflow-hidden bg-gradient-hero">
                <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary-200/30 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-blue-200/20 blur-3xl" />

                <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease }}
                        className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-primary-600 shadow-sm ring-1 ring-primary-100"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        AI-Powered Post-Discharge Monitoring
                    </motion.span>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease }}
                        className="max-w-3xl text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
                    >
                        Your Recovery,{" "}
                        <span className="text-gradient">Intelligently Guided</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease }}
                        className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600"
                    >
                        Track symptoms, receive AI-powered insights, and stay connected
                        with your care team — all from a single, beautiful dashboard.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3, ease }}
                        className="mt-10 flex flex-wrap justify-center gap-4"
                    >
                        <Link to="/register">
                            <Button size="lg" className="shadow-glow-sm">
                                Start Free <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" size="lg">
                                Log in
                            </Button>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.45, ease }}
                        className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500"
                    >
                        <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-500" /> HIPAA-Ready
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-500" /> End-to-End Encrypted
                        </span>
                        <span className="flex items-center gap-1.5">
                            <CheckCircle className="h-4 w-4 text-emerald-500" /> No Credit Card
                        </span>
                    </motion.div>
                </div>
            </section>

            {/* ─── Stats Bar ─────────────────────────── */}
            <section className="border-y border-gray-100 bg-white py-8">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-around gap-6 px-6 text-center">
                    {stats.map((s, i) => (
                        <FadeIn key={s.label} delay={i * 0.08}>
                            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
                            <p className="text-xs font-medium text-gray-500">{s.label}</p>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── Features Grid ─────────────────────── */}
            <section className="mx-auto max-w-6xl px-6 py-24">
                <FadeIn className="mx-auto mb-14 max-w-2xl text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                        Everything you need for a smooth recovery
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Built for patients and doctors alike — powerful features wrapped in simplicity.
                    </p>
                </FadeIn>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {features.map((f, i) => (
                        <FadeIn key={f.title} delay={i * 0.06}>
                            <div className="group relative rounded-2xl border border-gray-100 bg-white p-6 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
                                <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${f.color} p-2.5 text-white shadow-sm`}>
                                    {f.icon}
                                </div>
                                <h3 className="text-[15px] font-semibold text-gray-900">{f.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                            </div>
                        </FadeIn>
                    ))}
                </div>
            </section>

            {/* ─── Testimonial / CTA ─────────────────── */}
            <section className="bg-gray-50/80 py-24">
                <FadeIn className="mx-auto max-w-3xl px-6 text-center">
                    <div className="mx-auto mb-8 flex justify-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                    </div>
                    <blockquote className="text-xl font-medium leading-relaxed text-gray-700 italic">
                        &ldquo;Recovery Companion made my post-surgery journey so much less stressful.
                        The AI insights caught a warning sign my doctor confirmed — it genuinely
                        helped my recovery.&rdquo;
                    </blockquote>
                    <p className="mt-6 text-sm font-semibold text-gray-500">— Patient Testimonial</p>

                    <div className="mt-12">
                        <Link to="/register">
                            <Button size="lg" className="shadow-glow-sm">
                                Start Your Recovery Journey <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        <p className="mt-4 text-xs text-gray-400">Free forever for patients. No setup required.</p>
                    </div>
                </FadeIn>
            </section>

            {/* ─── Footer ────────────────────────────── */}
            <footer className="border-t border-gray-100 bg-white py-8">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <Heart className="h-4 w-4 fill-primary-400 text-primary-400" />
                        Recovery Companion
                    </div>
                    <p className="text-xs text-gray-400">
                        © {new Date().getFullYear()} Recovery Companion. Built with care.
                    </p>
                </div>
            </footer>
        </div>
    );
}
