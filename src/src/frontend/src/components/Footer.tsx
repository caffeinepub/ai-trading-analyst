import { TrendingUp } from "lucide-react";
import { SiDiscord, SiGithub, SiTelegram, SiX } from "react-icons/si";

const FOOTER_LINKS = [
  {
    title: "Resources",
    links: ["Documentation", "API Reference", "Changelog", "Status", "Blog"],
  },
  {
    title: "Analysis",
    links: [
      "SMC Tools",
      "AMD Cycles",
      "Liquidity Zones",
      "Chart Patterns",
      "Backtesting",
    ],
  },
  {
    title: "Markets",
    links: [
      "XAU/USD Gold",
      "Forex Majors",
      "Forex Minors",
      "Risk Calculator",
      "Pip Calculator",
    ],
  },
  {
    title: "Legal",
    links: [
      "Terms of Service",
      "Privacy Policy",
      "Risk Disclosure",
      "Cookie Policy",
      "GDPR",
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(window.location.hostname);
  return (
    <footer
      className="border-t border-border/40 pt-12 pb-6 px-4 sm:px-6 lg:px-8"
      style={{ background: "oklch(0.16 0.028 240)" }}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-10">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">
                Apex <span className="text-teal">AI</span>
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
              Forex &amp; Gold Intelligence
            </p>
            <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
              Professional AI-powered forex and precious metals analysis. SMC,
              AMD cycles and liquidity intelligence for XAU/USD and major pairs.
            </p>
            <div className="flex items-center gap-3 mt-4">
              {[
                { icon: SiX, label: "X" },
                { icon: SiGithub, label: "GitHub" },
                { icon: SiDiscord, label: "Discord" },
                { icon: SiTelegram, label: "Telegram" },
              ].map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="/#"
                  aria-label={label}
                  className="w-8 h-8 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-teal/40 transition-colors"
                  data-ocid={`footer.${label.toLowerCase()}.link`}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {FOOTER_LINKS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="/#"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      data-ocid={`footer.${col.title.toLowerCase()}.${link.toLowerCase().replace(/[^a-z0-9]/g, "_")}.link`}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Forex and precious metals trading involves substantial risk of loss.
            Past performance is not indicative of future results.
          </p>
          <p className="text-xs text-muted-foreground">
            © {year}.{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-teal transition-colors"
            >
              Built with ❤️ using caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
