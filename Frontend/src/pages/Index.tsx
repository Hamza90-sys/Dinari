import { Layout } from "@/components/Layout";
import { Hero } from "@/components/sections/Hero";
import { TrustedBy } from "@/components/sections/TrustedBy";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Features } from "@/components/sections/Features";
import { Testimonials } from "@/components/sections/Testimonials";
import { CTA } from "@/components/sections/CTA";
import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const Index = () => {
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    document.title = "Dinari - Pay for international services from Tunisia";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Dinari helps Tunisians subscribe to ChatGPT, Netflix, Spotify and more - paid in TND with secure local processing.",
      );
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content =
        "Dinari helps Tunisians subscribe to ChatGPT, Netflix, Spotify and more - paid in TND with secure local processing.";
      document.head.appendChild(m);
    }
  }, []);

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Layout>
      <Hero />
      <TrustedBy />
      <HowItWorks />
      <Features />
      <Testimonials />
      <CTA />
    </Layout>
  );
};

export default Index;
