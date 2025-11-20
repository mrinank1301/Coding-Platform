"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Code, Terminal, Cpu } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Elements */}
      <div className="absolute inset-0 w-full h-full bg-[#030712]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      </div>

      <div className="container relative z-10 px-4 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-gray-300">v2.0 is now live</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Code the Future <br />
          <span className="text-gradient">Build with Speed</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
        >
          Experience the next generation of coding platforms. Real-time collaboration, 
          AI-powered suggestions, and a beautiful interface designed for modern developers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2 group"
          >
            Start Coding Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#features"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all duration-300 backdrop-blur-sm flex items-center justify-center gap-2"
          >
            Explore Features
          </Link>
        </motion.div>

        {/* Floating Code Cards */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-12 hidden xl:block">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="glass-card p-4 rounded-2xl w-64 rotate-[-6deg]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                <Code className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium text-gray-200">Smart Editor</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-3/4 bg-white/10 rounded-full" />
              <div className="h-2 w-1/2 bg-white/10 rounded-full" />
            </div>
          </motion.div>
        </div>

        <div className="absolute top-1/2 -translate-y-1/2 -right-12 hidden xl:block">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="glass-card p-4 rounded-2xl w-64 rotate-[6deg]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium text-gray-200">Live Execution</div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-2/3 bg-white/10 rounded-full" />
              <div className="h-2 w-full bg-white/10 rounded-full" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
