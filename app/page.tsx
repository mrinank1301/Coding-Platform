import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#030712] text-white selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <Hero />
      <Features />
      <Footer />
    </main>
  );
}
