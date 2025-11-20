import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#030712] pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-4 block">
              Platform
            </Link>
            <p className="text-muted-foreground max-w-sm">
              Building the future of coding education and collaboration. Join our community of developers today.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Features</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Changelog</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Docs</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">About</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Careers</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
              <Github className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
              <Twitter className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-white transition-colors">
              <Linkedin className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
