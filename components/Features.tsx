"use client";

import { motion } from "framer-motion";
import { Code2, Zap, Users, Globe, Shield, Cpu } from "lucide-react";

const features = [
  {
    title: "Smart Code Editor",
    description: "Intelligent autocompletion and syntax highlighting for over 50+ languages.",
    icon: Code2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
  },
  {
    title: "Real-time Execution",
    description: "Run your code instantly in secure, isolated sandboxes.",
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    title: "Collaborative Coding",
    description: "Pair program in real-time with audio and video chat integration.",
    icon: Users,
    color: "text-green-400",
    bg: "bg-green-500/10",
    colSpan: "col-span-1 md:col-span-1 lg:col-span-1",
  },
  {
    title: "Global Infrastructure",
    description: "Low latency execution from edge nodes worldwide.",
    icon: Globe,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    colSpan: "col-span-1 md:col-span-2 lg:col-span-2",
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Everything you need to <span className="text-gradient">build faster</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Our platform provides the tools you need to take your coding skills to the next level.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`glass-card p-8 rounded-3xl hover:border-indigo-500/50 transition-colors group ${feature.colSpan}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${feature.bg}`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-100 group-hover:text-indigo-400 transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
