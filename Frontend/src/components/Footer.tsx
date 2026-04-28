import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { Mail, MapPin, Phone } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Dinari makes international subscriptions accessible to every Tunisian.
              Pay in TND, we handle the rest.
            </p>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" /> hello@dinari.tn
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" /> +216 71 000 000
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" /> Tunis, Tunisia
              </div>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol title="Product" links={[
              { label: "Services", to: "/services" },
              { label: "Request payment", to: "/request" },
              { label: "Dashboard", to: "/dashboard" },
              { label: "Pricing", to: "#" },
            ]} />
            <FooterCol title="Company" links={[
              { label: "About", to: "#" },
              { label: "Blog", to: "#" },
              { label: "Careers", to: "#" },
              { label: "Contact", to: "#" },
            ]} />
            <FooterCol title="Legal" links={[
              { label: "Privacy", to: "#" },
              { label: "Terms", to: "#" },
              { label: "Refunds", to: "#" },
              { label: "Security", to: "#" },
            ]} />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Dinari. All rights reserved.</p>
          <p>Made with care in Tunis 🇹🇳</p>
        </div>
      </div>
    </footer>
  );
};

const FooterCol = ({ title, links }: { title: string; links: { label: string; to: string }[] }) => (
  <div>
    <h4 className="font-display text-sm font-semibold text-foreground">{title}</h4>
    <ul className="mt-4 space-y-3">
      {links.map((l) => (
        <li key={l.label}>
          <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-primary">
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
