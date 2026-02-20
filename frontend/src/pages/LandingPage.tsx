import { Link } from "react-router-dom";
import { Heart, ArrowRight, Shield, Brain, Activity } from "lucide-react";
import Button from "@/components/Button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-primary-600 font-bold text-lg">
          <Heart className="h-6 w-6 fill-primary-500" />
          Recovery Companion
        </div>
        <div className="flex gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <span className="mb-4 inline-block rounded-full bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-600">
          AI-Powered Post-Discharge Monitoring
        </span>
        <h1 className="text-gradient max-w-2xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Your Recovery, <br /> Intelligently Guided
        </h1>
        <p className="mt-4 max-w-lg text-gray-500">
          Track symptoms, receive AI insights, and stay connected with your care
          team — all from a single dashboard.
        </p>
        <div className="mt-8 flex gap-3">
          <Link to="/register">
            <Button size="lg">
              Start Free <ArrowRight className="ml-1 h-4 w-4 inline" />
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" size="lg">Log in</Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-4xl gap-6 px-6 py-16 sm:grid-cols-3">
        {[
          {
            icon: <Activity className="h-6 w-6 text-primary-500" />,
            title: "Daily Logging",
            desc: "Quickly log pain, mood, energy, sleep & more with simple sliders.",
          },
          {
            icon: <Brain className="h-6 w-6 text-primary-500" />,
            title: "AI Analysis",
            desc: "Groq-powered insights detect trends and warning signs in real time.",
          },
          {
            icon: <Shield className="h-6 w-6 text-primary-500" />,
            title: "Doctor Alerts",
            desc: "Automatic escalations notify your doctor when metrics look concerning.",
          },
        ].map((f) => (
          <div key={f.title} className="card text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50">
              {f.icon}
            </div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Recovery Companion
      </footer>
    </div>
  );
}
