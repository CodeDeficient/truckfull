import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import EventCard from '@/components/ui/molecules/EventCard';

export default function Bi_events_premium_() {
  return (
    <>
      <CommonPageHead title="BI & Events (Premium)" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
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

      <div className="relative flex size-full min-h-screen flex-col justify-between group/design-root overflow-x-hidden">
        <div className="flex-grow">
          <header className="sticky top-0 z-10 bg-[#181111]/80 backdrop-blur-sm">
            <div className="flex items-center p-4 pb-2 justify-between">
              <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10">
                <span className="material-symbols-outlined"> arrow_back_ios_new </span>
              </button>
              <h1 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
                Analytics
              </h1>
              <div className="size-10" />
            </div>
          </header>
          <main className="p-4">
            <h2 className="text-white text-2xl font-bold leading-tight tracking-[-0.015em] pb-4">
              AI Event Recommendations
            </h2>
            <div className="space-y-6">
              <EventCard
                title="Food Truck Festival"
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuDTyzc3onvHZ94hcrsKvONcomgo04WVzjr6_qYC8kkJwCpv-MpWrugR8ih8EwiXojaqnU7LMiWzEckddZ8ZJJYYOIMUwy5rym5NZfA-PKZAQuWKGKykv3V085OjszR1fhvDQrmnSBUd0VPAJvk_gsEwqCaSZeaiUj1SvEcn-vTYNgKv0kn3HgOLMKTb55LU0OsmtDeQ4iPmzygztFVN6wsaV7bhVNTPp_gKI8grWyskLM3rktBJR2QO3YwG2dsQssHtKBt7i3NBqVBl"
                location="Downtown Park"
                estimatedProfit="15,000"
              />
              <EventCard
                title="Summer Concert Series"
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuDgVjRz4vPcDRFdICJZbNY2lYRBi5Ir_GLdqqwjV4ZK-DPMAzCW81oGkG8q4wCBhbnamZ3SgcHc4MKQKhE9x5gTL0I9Zl8FVJfGn2vPU9rIYvN3WaLBIpBmfgVJekmqqKvQu_xRl1kg-mG4eJfOz1SAw5BCwed3ECsQpdrgoACoJ7Zi1FkYmoirak0-6ZD2_UCkU2WpllPQ4-u7aCGWIF3hbigjZEIzvl1qWaw7Xo8diaqpVjs8a0FrT8Uob7098Eh6k8wFgACLDwLO"
                location="Waterfront Amphitheater"
                estimatedProfit="12,000"
              />
              <EventCard
                title="Community Block Party"
                image="https://lh3.googleusercontent.com/aida-public/AB6AXuB2Cb0QQmLHvCNoVAKOepaub_p9u8my8GWh1ukRLOwlNMvNYARFU1Q1LedutlR8uPyymF6Xa38o2lkug1cmZib9EIlmOI8raHOsNwd1lMr0yKJ8p1UqJSkHEeqksN3u_e-787yCY3U6P29ZljxVfSqb6UcRAq3x17lULSeSxpeAT5DXdkFx8Dr89M2Sz5fijjpPX8RWu7FzrWsdW2K5iK5bQQ5MaFRCf6_A0kDukuf4o2Ct2AAMzQf-wYkjv-afaWjf8xRLbykS_9B"
                location="Neighborhood Square"
                estimatedProfit="8,000"
              />
            </div>
          </main>
        </div>
        <footer
          className="sticky bottom-0 bg-[#181111]/80 backdrop-blur-sm border-t border-white/10"
          style={{ touchAction: 'none' }}
        >
          <nav className="flex justify-around py-2 px-4">
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
            >
              <span className="material-symbols-outlined"> home </span>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Home</p>
            </button>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-end gap-1 rounded-full text-[var(--primary-color)]"
            >
              <span className="material-symbols-outlined"> bar_chart </span>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Analytics</p>
            </button>
            <button
              type="button"
              className="flex flex-1 flex-col items-center justify-end gap-1 text-white/60"
            >
              <span className="material-symbols-outlined"> person </span>
              <p className="text-xs font-medium leading-normal tracking-[0.015em]">Profile</p>
            </button>
          </nav>
          <div className="h-5 bg-transparent" />
        </footer>
      </div>
    </>
  );
}
