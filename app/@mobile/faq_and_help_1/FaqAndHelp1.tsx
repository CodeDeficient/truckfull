import React from 'react';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Faq_and_help_1() {
  return (
    <>
      <CommonPageHead title="FAQ and Help" />
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#101010] justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex flex-col grow">
          <header className="flex items-center p-4 pb-2 justify-between sticky top-0 z-10 bg-[#101010]/50 backdrop-blur-lg">
            <button className="text-white flex size-10 shrink-0 items-center justify-center rounded-full">
              <span className="material-symbols-outlined"> arrow_back </span>
            </button>
            <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] flex-1 text-center">
              Help &amp; FAQs
            </h2>
            <div className="size-10" />
          </header>
          <main className="flex-grow px-4 py-3">
            <div className="relative w-full mb-6">
              <input
                className="form-input w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-white focus:outline-none focus:ring-2 focus:ring-[#ea2a2a]/50 border-none bg-white/5 h-12 placeholder:text-gray-500 pl-12 pr-4 text-base font-normal leading-normal"
                placeholder="Search for questions..."
                value=""
              />
              <div
                className="text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
                data-size="24px"
                data-weight="regular"
              >
                <span className="material-symbols-outlined"> search </span>
              </div>
            </div>
            <section>
              <h3 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] pb-4">
                Common Questions
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                  <div className="text-white flex items-center justify-center rounded-full bg-[#ea2a2a]/20 shrink-0 size-12 border-2 border-[#ea2a2a]/50">
                    <span className="material-symbols-outlined"> search </span>
                  </div>
                  <div className="flex flex-col justify-center grow">
                    <p className="text-white text-base font-medium leading-normal">
                      How do I search for food trucks?
                    </p>
                    <p className="text-gray-400 text-sm font-normal leading-normal">
                      Find trucks near you
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                  <div className="text-white flex items-center justify-center rounded-full bg-[#ea2a2a]/20 shrink-0 size-12 border-2 border-[#ea2a2a]/50">
                    <span className="material-symbols-outlined"> favorite </span>
                  </div>
                  <div className="flex flex-col justify-center grow">
                    <p className="text-white text-base font-medium leading-normal">
                      How do I save food trucks?
                    </p>
                    <p className="text-gray-400 text-sm font-normal leading-normal">
                      Save your favorite trucks
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </div>
                <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-xl">
                  <div className="text-white flex items-center justify-center rounded-full bg-[#ea2a2a]/20 shrink-0 size-12 border-2 border-[#ea2a2a]/50">
                    <span className="material-symbols-outlined"> mail </span>
                  </div>
                  <div className="flex flex-col justify-center grow">
                    <p className="text-white text-base font-medium leading-normal">
                      How do I contact support?
                    </p>
                    <p className="text-gray-400 text-sm font-normal leading-normal">
                      Report issues or feedback
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500"> chevron_right </span>
                </div>
              </div>
            </section>
          </main>
        </div>
        <footer
          className="sticky bottom-0 px-4 py-3 bg-[#101010]/50 backdrop-blur-lg"
          style={{ touchAction: 'none' }}
        >
          <div className="flex flex-col items-stretch gap-3">
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-[#ea2a2a] text-white text-base font-bold leading-normal tracking-[0.015em] w-full">
              <span className="truncate">Contact Support</span>
            </button>
            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-4 bg-white/10 text-white text-base font-bold leading-normal tracking-[0.015em] w-full">
              <span className="truncate">View All FAQs</span>
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
