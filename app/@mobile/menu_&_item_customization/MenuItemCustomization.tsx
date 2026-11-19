import React from 'react';
import Image from 'next/image';
import CommonPageHead from '@/components/ui/organisms/CommonPageHead';

export default function Menu_item_customization() {
  return (
    <>
      <CommonPageHead title="TruckFull - Menu" />
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col justify-between group/design-root overflow-x-hidden text-white">
        <div className="flex-grow">
          <header className="sticky top-0 z-10 glassmorphism">
            <div className="flex items-center p-4 justify-between">
              <button className="flex size-10 items-center justify-center rounded-full">
                <span className="material-symbols-outlined"> arrow_back_ios_new </span>
              </button>
              <h1 className="text-xl font-bold">The Taco Truck</h1>
              <div className="size-10" />
            </div>
          </header>
          <main>
            <div className="relative h-64">
              <Image
                alt="Taco Truck"
                className="absolute inset-0 size-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnPTc716t3gg0FB6mwqLupemdxRWigvAHqKdHm1TtdaRwl0sDBOXjIX4jG4HlmDOTGYC-Fzp5RIsqvc8cAHvluT3pOdbYb_P5DGydduBxwOkJrYhGGAIiNi2evggtxbHt4pbr1g6hv4fzRajN1OLi6fR7tJ8pZ701kxsjrjtycZp35btr2hicKlDmzrHFvhUin8xmuYMRNkgiuF3qUiBVluxDDSVVvHxr6ig5LV7JsIY0zw_HU12QZb7WBsNFPbKkJcvHF5pEyEdSU"
                width={256}
                height={256}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="p-4">
              <div id="menu-sections">
                <section className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Tacos</h2>
                  <ul className="space-y-4">
                    <li className="glassmorphism rounded-lg p-4 flex items-center justify-between transition-transform duration-300 hover:scale-105 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">Carne Asada Taco</h3>
                        <p className="text-gray-400">Grilled steak, onions, cilantro</p>
                        <p className="font-bold mt-1">$4.50</p>
                      </div>
                      <button className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-color)]">
                        <span className="material-symbols-outlined"> add </span>
                      </button>
                    </li>
                    <li className="glassmorphism rounded-lg p-4 flex items-center justify-between transition-transform duration-300 hover:scale-105 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">Al Pastor Taco</h3>
                        <p className="text-gray-400">Marinated pork, pineapple, onions</p>
                        <p className="font-bold mt-1">$4.00</p>
                      </div>
                      <button className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-color)]">
                        <span className="material-symbols-outlined"> add </span>
                      </button>
                    </li>
                    <li className="glassmorphism rounded-lg p-4 flex items-center justify-between transition-transform duration-300 hover:scale-105 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">Pollo Asado Taco</h3>
                        <p className="text-gray-400">Grilled chicken, pico de gallo</p>
                        <p className="font-bold mt-1">$3.50</p>
                      </div>
                      <button className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-color)]">
                        <span className="material-symbols-outlined"> add </span>
                      </button>
                    </li>
                  </ul>
                </section>
                <section>
                  <h2 className="text-2xl font-bold mb-4">Sides</h2>
                  <ul className="space-y-4">
                    <li className="glassmorphism rounded-lg p-4 flex items-center justify-between transition-transform duration-300 hover:scale-105 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">Chips &amp; Salsa</h3>
                        <p className="text-gray-400">Freshly made tortilla chips and salsa</p>
                        <p className="font-bold mt-1">$3.00</p>
                      </div>
                      <button className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-color)]">
                        <span className="material-symbols-outlined"> add </span>
                      </button>
                    </li>
                    <li className="glassmorphism rounded-lg p-4 flex items-center justify-between transition-transform duration-300 hover:scale-105 cursor-pointer">
                      <div>
                        <h3 className="font-semibold text-lg">Guacamole</h3>
                        <p className="text-gray-400">Avocado, onion, cilantro, lime</p>
                        <p className="font-bold mt-1">$5.00</p>
                      </div>
                      <button className="flex size-10 items-center justify-center rounded-full bg-[var(--primary-color)]">
                        <span className="material-symbols-outlined"> add </span>
                      </button>
                    </li>
                  </ul>
                </section>
              </div>
            </div>
          </main>
        </div>
        <footer className="sticky bottom-0 z-10 glassmorphism p-4" style={{ touchAction: 'none' }}>
          <button className="w-full flex items-center justify-center gap-2 rounded-lg h-14 bg-[var(--primary-color)] text-white text-lg font-bold">
            <span>View Cart</span>
            <span className="font-semibold">(3 items)</span>
          </button>
        </footer>
      </div>
    </>
  );
}
