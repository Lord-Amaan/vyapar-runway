import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Check, CircleDollarSign, Menu, ShieldCheck, WalletCards, X } from "lucide-react";
import { translate, type Language } from "../i18n";
import LanguageSelect from "./LanguageSelect";

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

interface LandingPageProps {
  language?: Language;
  onLanguageChange?: (language: Language) => void;
}

export default function LandingPage({ language = "en", onLanguageChange }: LandingPageProps) {
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productPoints = [
    {
      icon: BarChart3,
      title: t("landingPoint1Title"),
      text: t("landingPoint1Text"),
    },
    {
      icon: WalletCards,
      title: t("landingPoint2Title"),
      text: t("landingPoint2Text"),
    },
    {
      icon: ShieldCheck,
      title: t("landingPoint3Title"),
      text: t("landingPoint3Text"),
    },
  ];

  const audiences = [
    t("landingAudience1"),
    t("landingAudience2"),
    t("landingAudience3"),
    t("landingAudience4"),
  ];

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  };

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
          <span>{t("appTitle")}</span>
        </a>
        <nav className="hidden md:flex items-center gap-7" aria-label="Main navigation">
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, "how-it-works")}>
            {t("navHowItWorks")}
          </a>
          <a href="#built-for" onClick={(e) => scrollToSection(e, "built-for")}>
            {t("navBuiltFor")}
          </a>
          <a href="#why-it-matters" onClick={(e) => scrollToSection(e, "why-it-matters")}>
            {t("navWhyItMatters")}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {onLanguageChange && (
            <LanguageSelect
              id="landing-language-select"
              language={language}
              onChange={onLanguageChange}
              variant="dark"
            />
          )}
          <button type="button" className="landing-nav-cta" onClick={goToApp}>
            {t("navGetStarted")} <ArrowRight size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="md:hidden text-[#faf9f6] p-1.5 focus:outline-none focus:ring-1 focus:ring-[#d88766] rounded cursor-pointer"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="md:hidden sticky top-[68px] z-40 bg-[#190b05] border-b border-[rgba(250,249,246,0.16)] px-6 py-4 flex flex-col gap-4 text-[#faf9f6] text-[14px]">
          <a href="#how-it-works" onClick={(e) => scrollToSection(e, "how-it-works")}>
            {t("navHowItWorks")}
          </a>
          <a href="#built-for" onClick={(e) => scrollToSection(e, "built-for")}>
            {t("navBuiltFor")}
          </a>
          <a href="#why-it-matters" onClick={(e) => scrollToSection(e, "why-it-matters")}>
            {t("navWhyItMatters")}
          </a>
          {onLanguageChange && (
            <div className="pt-2 border-t border-[rgba(250,249,246,0.16)]">
              <LanguageSelect
                id="landing-mobile-language-select"
                language={language}
                onChange={onLanguageChange}
                variant="dark"
                className="w-full justify-between"
              />
            </div>
          )}
        </div>
      )}

      <main>
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-eyebrow">{t("landingEyebrow")}</p>
              <h1>{t("landingHeroHeading")}</h1>
              <p className="landing-hero-text">{t("landingHeroText")}</p>
              <div className="landing-actions">
                <button type="button" className="landing-primary" onClick={goToApp}>
                  {t("navGetStarted")} <ArrowRight size={18} aria-hidden="true" />
                </button>
                <a
                  className="landing-text-link"
                  href="#how-it-works"
                  onClick={(e) => scrollToSection(e, "how-it-works")}
                >
                  {t("landingSeeHow")} <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="landing-hero-visual" aria-label="A preview of the stock planning dashboard">
              <div className="landing-visual-topline">
                <span>{t("landingNext30Days")}</span>
                <span className="landing-live-dot">{t("landingForecastReady")}</span>
              </div>
              <AnimatedAmount value={444417} />
              <p>{t("landingProjectedInflow")}</p>
              <div className="landing-visual-chart">
                <span className="chart-line chart-line-one" />
                <span className="chart-line chart-line-two" />
                <span className="chart-point chart-point-one" />
                <span className="chart-point chart-point-two" />
                <span className="chart-point chart-point-three" />
              </div>
              <div className="landing-visual-footer">
                <span><i className="visual-dot visual-copper" /> {t("landingBankUpi")}</span>
                <span><i className="visual-dot visual-amber" /> {t("landingEstimatedCash")}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-proof" aria-label="Product benefits">
          <p>{t("landingProofText")}</p>
          <div className="landing-proof-items">
            <span>{t("landingProofItem1")}</span>
            <span>{t("landingProofItem2")}</span>
            <span>{t("landingProofItem3")}</span>
            <span>{t("landingProofItem4")}</span>
          </div>
        </section>

        <section className="landing-section scroll-reveal" id="how-it-works">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">{t("landingSection1Eyebrow")}</p>
            <h2>{t("landingSection1Heading")}</h2>
            <p>{t("landingSection1Desc")}</p>
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
            <p className="landing-eyebrow">{t("landingSection2Eyebrow")}</p>
            <h2>{t("landingSection2Heading")}</h2>
          </div>
          <div className="landing-band-copy">
            <CircleDollarSign size={28} strokeWidth={1.5} aria-hidden="true" />
            <p>{t("landingSection2Copy")}</p>
          </div>
        </section>

        <section className="landing-section landing-audience scroll-reveal" id="built-for">
          <div className="landing-section-heading compact">
            <p className="landing-eyebrow">{t("landingAudienceEyebrow")}</p>
            <h2>{t("landingAudienceHeading")}</h2>
          </div>
          <div className="landing-audience-list">
            {audiences.map((audience) => (
              <span key={audience}><Check size={16} aria-hidden="true" /> {audience}</span>
            ))}
          </div>
        </section>

        <section className="landing-cta scroll-reveal">
          <p className="landing-eyebrow">{t("landingCtaEyebrow")}</p>
          <h2>{t("landingCtaHeading")}</h2>
          <button type="button" className="landing-primary" onClick={goToApp}>
            {t("landingOpenApp")} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <span>{t("landingFooterBrand")}</span>
        <span>{t("landingFooterTagline")}</span>
      </footer>
    </div>
  );
}
