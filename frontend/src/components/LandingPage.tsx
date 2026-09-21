import { useEffect, useRef } from "react";
import { ArrowRight, BarChart3, Check, CircleDollarSign, Menu, ShieldCheck, WalletCards } from "lucide-react";

const productPoints = [
  {
    icon: BarChart3,
    title: "See the next 30 days",
    text: "A simple forecast of the UPI money your shop may bring in before the next stock payment.",
  },
  {
    icon: WalletCards,
    title: "Bring cash into the picture",
    text: "Adjust for walk-in customers who pay from the galla, without confusing estimates with bank money.",
  },
  {
    icon: ShieldCheck,
    title: "Plan before you commit",
    text: "Test a wholesaler payment against your expected inflow and spot a risky order early.",
  },
];

const audiences = ["Kirana stores", "Festival stockists", "Local wholesalers", "Growing retail shops"];

function AnimatedAmount({ value }: { value: number }) {
  const amountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = amountRef.current;
    if (!element) return;

    const formatter = new Intl.NumberFormat("en-IN");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = 1400;
    const start = performance.now();

    if (reducedMotion) {
      element.textContent = `₹${formatter.format(value)}`;
      return;
    }

    let frame = 0;
    const update = (now: number) => {
      const progress = Math.max(0, Math.min((now - start) / duration, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `₹${formatter.format(Math.round(value * eased))}`;
      if (progress < 1) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <div ref={amountRef} className="landing-visual-number">₹0</div>;
}

function goToApp() {
  window.location.assign("/app");
}

export default function LandingPage() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".scroll-reveal");

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6%" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="/" aria-label="VyaparRunway home">
          <span className="landing-brand-mark">↘</span>
          <span>VyaparRunway</span>
        </a>
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#built-for">Built for retail</a>
          <a href="#why-it-matters">Why it matters</a>
        </nav>
        <button type="button" className="landing-nav-cta" onClick={goToApp}>
          Get started <ArrowRight size={16} aria-hidden="true" />
        </button>
        <Menu className="md:hidden" size={20} aria-label="Menu" />
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">Festival planning for everyday businesses</p>
              <h1>Know what your shop can carry next.</h1>
              <p className="landing-hero-text">
                VyaparRunway helps Indian retailers turn payment history into a clearer stock plan before the festive rush.
              </p>
              <div className="landing-actions">
                <button type="button" className="landing-primary" onClick={goToApp}>
                  Get started <ArrowRight size={18} aria-hidden="true" />
                </button>
                <a className="landing-text-link" href="#how-it-works">See how it works <ArrowRight size={16} aria-hidden="true" /></a>
              </div>
            </div>

            <div className="landing-hero-visual" aria-label="A preview of the stock planning dashboard">
              <div className="landing-visual-topline">
                <span>Next 30 days</span>
                <span className="landing-live-dot">Forecast ready</span>
              </div>
              <AnimatedAmount value={444417} />
              <p>projected store inflow</p>
              <div className="landing-visual-chart">
                <span className="chart-line chart-line-one" />
                <span className="chart-line chart-line-two" />
                <span className="chart-point chart-point-one" />
                <span className="chart-point chart-point-two" />
                <span className="chart-point chart-point-three" />
              </div>
              <div className="landing-visual-footer">
                <span><i className="visual-dot visual-copper" /> Bank UPI</span>
                <span><i className="visual-dot visual-amber" /> Estimated cash</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-proof" aria-label="Product benefits">
          <p>Built for the decisions that happen between today&apos;s sale and tomorrow&apos;s stock order.</p>
          <div className="landing-proof-items">
            <span>UPI history</span><span>Cash estimates</span><span>Festival demand</span><span>Wholesaler planning</span>
          </div>
        </section>

        <section className="landing-section scroll-reveal" id="how-it-works">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">One clearer view</p>
            <h2>From payment signals to a better stocking decision.</h2>
            <p>Not another accounting system. A focused planning layer for the moment when you need to decide how much stock to buy.</p>
          </div>
          <div className="landing-point-grid">
            {productPoints.map(({ icon: Icon, title, text }, index) => (
              <article className="landing-point scroll-reveal" key={title}>
                <span className="landing-point-index">0{index + 1}</span>
                <Icon size={22} strokeWidth={1.6} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-band scroll-reveal" id="why-it-matters">
          <div>
            <p className="landing-eyebrow">Designed for confidence, not certainty</p>
            <h2>Keep verified money and estimated cash in view at the same time.</h2>
          </div>
          <div className="landing-band-copy">
            <CircleDollarSign size={28} strokeWidth={1.5} aria-hidden="true" />
            <p>See what comes from UPI, what depends on walk-ins, and how both change the shape of your next order.</p>
          </div>
        </section>

        <section className="landing-section landing-audience scroll-reveal" id="built-for">
          <div className="landing-section-heading compact">
            <p className="landing-eyebrow">Built for the shop floor</p>
            <h2>Useful when the festival rush is close.</h2>
          </div>
          <div className="landing-audience-list">
            {audiences.map((audience) => (
              <span key={audience}><Check size={16} aria-hidden="true" /> {audience}</span>
            ))}
          </div>
        </section>

        <section className="landing-cta scroll-reveal">
          <p className="landing-eyebrow">Start with your next order</p>
          <h2>Make the next stock decision with more of the picture.</h2>
          <button type="button" className="landing-primary" onClick={goToApp}>
            Open VyaparRunway <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>VyaparRunway</span>
        <span>Festival Stock Planner</span>
      </footer>
    </div>
  );
}
