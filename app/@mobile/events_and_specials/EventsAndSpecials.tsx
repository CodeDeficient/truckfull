import Footer from './_components/Footer';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';
import CalendarComponent from './_components/CalendarComponent';
import FeaturedSpecialsComponent from './_components/FeaturedSpecialsComponent';
import PromotionalOffersComponent from './_components/PromotionalOffersComponent';
import { MobileNavLink } from '../components/MobileNavLink';

export default function Events_and_specials() {
  return (
    <>
      <CommonPageHead title="Events and Specials" />
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
      }
    `}</style>

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#181111] dark group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow">
          <header className="sticky top-0 z-10 bg-black/50 backdrop-blur-lg">
            <div className="flex items-center p-4 pb-2 justify-between">
              <button className="text-white flex size-10 items-center justify-center">
                <span className="material-symbols-outlined">arrow_back_ios</span>
              </button>
              <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
                Events
              </h2>
            </div>
            <div className="pb-3">
              <div className="flex border-b border-white/20 px-4 gap-8">
                <MobileNavLink
                  className="flex flex-col items-center justify-center border-b-2 border-b-white text-white pb-3 pt-2"
                  href="/@mobile/events_and_specials"
                >
                  <p className="text-white text-sm font-semibold leading-normal">Calendar</p>
                </MobileNavLink>
                <MobileNavLink
                  className="flex flex-col items-center justify-center border-b-2 border-b-transparent text-white/50 pb-3 pt-2"
                  href="/@mobile/events_and_specials/list"
                >
                  <p className="text-sm font-medium leading-normal">List</p>
                </MobileNavLink>
              </div>
            </div>
          </header>
          <main className="p-4">
            <CalendarComponent />
            <FeaturedSpecialsComponent />
            <PromotionalOffersComponent />
          </main>
        </div>
        <Footer />
      </div>
    </>
  );
}
