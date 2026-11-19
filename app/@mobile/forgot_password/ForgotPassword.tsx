import React from 'react';
import Image from 'next/image';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Forgot_password() {
  return (
    <>
      <meta charSet="utf-8" />
      <title>TruckFull - Forgot Password</title>
      <link href="data:image/x-icon;base64," rel="icon" type="image/x-icon" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
      body {
      }
      .glassmorphism {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative min-h-screen flex flex-col justify-center items-center p-4">
        <div className="absolute inset-0">
          <Image
            alt=""
            className="absolute top-1/4 left-1/4 w-32 h-32 opacity-10 -rotate-12"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFI_Dz2DGpU3wFpNleVkCUVkU7gUI9pYdGqM62anjA2jNNRzkSGUk9yWLp7loIByK6td2N0Ev23fZ3ZuNdP15xRTg4Z7L-B5p1OLrveyEEONNMyvk6Vpa_uTc4Y-Gn7WqfUxFN17PEtnS8kylE6CjkwvMGdnqYUut7SmcRVDluRtWV4H37e0zEfjRiL_6ERHub0keUujh1HAKERv5rFV8-V_B0zntN6Qi4wCu4jmbtSWEY6yCa_jS23j2u9pndBuEKxnHok6tDAIZ6"
            width={128}
            height={128}
          />
          <Image
            alt=""
            className="absolute bottom-1/4 right-1/4 w-24 h-24 opacity-10 rotate-12"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFI_Dz2DGpU3wFpNleVkCUVkU7gUI9pYdGqM62anjA2jNNRzkSGUk9yWLp7loIByK6td2N0Ev23fZ3ZuNdP15xRTg4Z7L-B5p1OLrveyEEONNMyvk6Vpa_uTc4Y-Gn7WqfUxFN17PEtnS8kylE6CjkwvMGdnqYUut7SmcRVDluRtWV4H37e0zEfjRiL_6ERHub0keUujh1HAKERv5rFV8-V_B0zntN6Qi4wCu4jmbtSWEY6yCa_jS23j2u9pndBuEKxnHok6tDAIZ6"
            width={96}
            height={96}
          />
          <div className="absolute top-0 -left-1/4 w-96 h-96 bg-[var(--primary-color)]/20 rounded-full filter blur-3xl opacity-50" />
          <div className="absolute bottom-0 -right-1/4 w-96 h-96 bg-[var(--primary-color)]/20 rounded-full filter blur-3xl opacity-50" />
        </div>
        <div className="relative w-full max-w-sm glassmorphism rounded-2xl p-8 space-y-6">
          <div className="absolute top-4 right-4">
            <button className="text-white/70 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Forgot Password</h1>
            <p className="text-white/70 text-sm">Enter your email to get a password reset link.</p>
          </div>
          <form className="space-y-6">
            <div>
              <label className="sr-only" htmlFor="email">
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
                  mail
                </span>
                <input
                  className="w-full bg-black/20 border border-white/20 rounded-lg h-14 pl-12 pr-4 text-white placeholder:text-white/50 focus:ring-2 focus:ring-[var(--primary-color)] focus:border-[var(--primary-color)] transition-all"
                  id="email"
                  placeholder="Your Email Address"
                  type="email"
                />
              </div>
            </div>
            <button
              className="w-full bg-[var(--primary-color)] hover:bg-red-700 text-white text-base font-bold h-12 rounded-lg transition-colors flex items-center justify-center gap-2"
              type="submit"
            >
              <span>Send Reset Link</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
          <div className="text-center text-sm text-white/50">
            <p>
              Remembered your password?{' '}
              <MobileNavLink
                className="font-semibold text-white/80 hover:text-white underline"
                href="/@mobile/login"
              >
                Log in
              </MobileNavLink>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
