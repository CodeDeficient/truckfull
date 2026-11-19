import React from 'react';

export default function Truckfull_splash_screen() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta content="width=device-width, initial-scale=1.0" name="viewport" />
      <title>TruckFull - Splash Screen</title>
      <style type="text/tailwindcss">{`
    :root {
      --primary-red: #ea2a2a;
      --background-dark: #121212;
    }
    body {
    }
    .glassmorphism {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
  `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden">
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center opacity-30"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuANIpwXghYRbhFETZwJtlWVmQmc4nr4LzMFaEnJLHUZSvxQUIWRkz4REKGKnmjLOLqjXoXGJ1Vo69NVulcUpjZbtS57GT0TLN_ZFOMO0Q5lEYVACScqEAzuQf2ckTe5kUnwar91GMs7w61qfwZ6oKJ_q3M-OLLTzpnnYKZtKcYDbpqrNI9WOsU38pNdXs0WEENigkHYNV5hIFzWLskC5lEjjuHJtmHgGPT_nbOXE-zkQf18CkerBFr88vP1zFZytdspjZYw7BwPyLRN')",
          }}
        />
        <div className="absolute w-[400px] h-[400px] bg-[var(--primary-red)] rounded-full -top-40 -left-60 opacity-50 blur-3xl" />
        <div className="absolute w-[300px] h-[300px] bg-white/10 rounded-full -bottom-40 -right-40 opacity-30 blur-3xl" />
        <div className="z-10 flex flex-col items-center justify-center text-center p-8">
          <div className="mb-6">
            <svg
              className="text-white drop-shadow-lg"
              fill="none"
              height="100"
              viewBox="0 0 24 24"
              width="100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 10H4V13H2V7C2 5.34315 3.34315 4 5 4H19C20.6569 4 22 5.34315 22 7V13H20V10Z"
                fill="currentColor"
              />
              <path
                d="M21 16H3C2.44772 16 2 16.4477 2 17V18C2 19.1046 2.89543 20 4 20H20C21.1046 20 22 19.1046 22 18V17C22 16.4477 21.5523 16 21 16Z"
                fill="var(--primary-red)"
              />
              <circle cx="6" cy="15" fill="white" r="2" />
              <circle cx="18" cy="15" fill="white" r="2" />
            </svg>
          </div>
          <h1 className="text-6xl font-extrabold text-white tracking-tighter drop-shadow-md">
            TruckFull
          </h1>
        </div>
        <div className="absolute bottom-10 w-full flex justify-center">
          <div className="w-24 h-1 bg-white/20 rounded-full" />
        </div>
      </div>
    </>
  );
}
