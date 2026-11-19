import React from 'react';
import CommonHead from '@/components/ui/organisms/CommonHead';
import MenuItem from '@/components/ui/molecules/MenuItem';
import { MobileNavLink } from '../components/MobileNavLink';

export default function ProfileMenuEditor() {
  return (
    <>
      <CommonHead />
      <title>TruckFull - Edit Menu</title>
      <style type="text/tailwindcss">{`
      :root {
        --primary-color: #ea2a2a;
        --background-color: #121212;
        --card-bg-color: rgba(255, 255, 255, 0.05);
        --text-primary: #FFFFFF;
        --text-secondary: #B0B0B0;
        --border-color: rgba(255, 255, 255, 0.1);
      }
      .glassmorphism {
        background: var(--card-bg-color);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border-radius: 1rem;
        border: 1px solid var(--border-color);
      }
    `}</style>
      <style>{`
    body {
      min-height: max(884px, 100dvh);
    }
  `}</style>

      <div className="relative flex size-full min-h-screen flex-col text-[var(--text-primary)] justify-between group/design-root">
        <div className="flex-grow">
          <header className="sticky top-0 z-10 glassmorphism mx-4 mt-4">
            <div className="flex items-center p-4 justify-between">
              <button className="flex size-10 items-center justify-center">
                <span className="material-symbols-outlined text-3xl">arrow_back_ios</span>
              </button>
              <h1 className="text-xl font-bold text-center flex-1">Edit Menu</h1>
              <button className="flex size-10 items-center justify-center">
                <span className="material-symbols-outlined text-3xl">edit</span>
              </button>
            </div>
          </header>
          <main className="p-4 space-y-4">
            <div className="glassmorphism p-4 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-[var(--text-secondary)]">Menu Items</h2>
              <div className="space-y-3">
                <MenuItem
                  altText="Chicken Tacos"
                  category="Tacos"
                  imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCbGR-Andp01j5Rrn_QYsNLlqLelrlN-16n-ykBkn_WMr0Wzc0RgotSeP1OzEBSpgEwTqJsJBdD9gn42Z6Jh6MJgu-pHm2yCnWo7Dez9_CJu1fJ757Ch0qwRGGu6TnkcyPTDsozcHR5XWxVp5gLoxDfMNRt5DJPnwTqYeCO8HVBZQugiPOyBya4XULepDiqfxlXcFOTQ7KXiSrAGqRIlFvII_QWdeDq8TAJbgcaTOTdsmGNU0mDSyKGF3I0IkxdeRSVVExrYjv56UBV"
                  isSoldOut={true}
                  name="Chicken Tacos"
                  onToggle={() => {}}
                />
                <MenuItem
                  altText="Beef Tacos"
                  category="Tacos"
                  imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuAOEAzc9n6nasueRsFhCkuiTrguza092c7OQUwb_IJb_qp4Y3MzwlRzU-TlBNNZmouYOCCch7WllgBeuubhP964msVyfWuNHqk-Jrk5GcemWA8twj2J3f-yS5W1BOlidv1F7rugryzukv_5ar6nm9nwx-oMurSMDcnpODDNB3cLEILiVsv6YRc9DNXWtvEO6LLuLdd7dPHs6im3YZK7Nj5lur33oXW0TmtFnjTfuE49cHxM6l53-iDbs2P9ECrB8u9XHamad_Byt9Kx"
                  isSoldOut={false}
                  name="Beef Tacos"
                  onToggle={() => {}}
                />
                <MenuItem
                  altText="Fish Tacos"
                  category="Tacos"
                  imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuB9D-f_ULa9H77ZA4ALL-OuPIb55AGnJ3lOkZJlba8ql1Bq4K3K3vkwBTdTnGMQu2ffVXmTaw2ECCQ7ITp8gE3yx7VZz7ZYssb5g-XO96bxdK8GBDQ8TA5jKKrOXEH5mZXdkDCRsKnD3m_lP4QKts2wb5Q--i2pVEv0L5lLgWxyt3ltAYdXMcTVZwAov07QzVMwiWDxKI7C9UJcdTVfd_dpn209CpXvvbPJ-6gK7Edc_GB5FJHhiisBCdQ6wmfMdsOjO7y3KuPv_lxj"
                  isSoldOut={false}
                  name="Fish Tacos"
                  onToggle={() => {}}
                />
                <MenuItem
                  altText="Veggie Tacos"
                  category="Tacos"
                  imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuCRn8VpTUsFQYH7YJyCijzcO5dQbwMAYJPfeyvu9fCjeoGuH2-MfEJs1VPfv5bJi6DuinUPpinT8ZKJbojKVT5ggN0e3l72yyDqIk86xgXumKH9H9gr-HPQR1YmxnsERow7y9kh61LTXWvqs7Hy6UW5_6VXCIVODGeF-tBBmSSfZRCk53qOpA6S37_doNuMEHxyRmkxCCekcqdIKAQsgKuvY-Q0hHeteMLVDigyqEnjMG8-m0_LsGLOVAJSL8RUSoZ_BXCWyuIKgRZc"
                  isSoldOut={true}
                  name="Veggie Tacos"
                  onToggle={() => {}}
                />
                <MenuItem
                  altText="Chips & Salsa"
                  category="Sides"
                  imageSrc="https://lh3.googleusercontent.com/aida-public/AB6AXuBa-CBrlxuWQiTTEErjcmPVwrd8SCH369Mgry2MYQ4hUwgJ9ny9rFrk3jwf5rp47tSrsuX3bv8Ua1ekQ6QEa5VRPC65A0F6f0Y_setZkRxkz50cmnWD7ViDZ_dvE0-yZ2CxrujMuedH6xVX0LTNtZzaqkrwcu_M9nZimMQ6THIkH3ORGtmrrmnktQhFpvCzBADcRSvmtaY3nemRQCezU3bFukL8brNis3NCRScdLYLxl1RHKQi11E8Z6bOTt0WsaFx40riXLqveZI3n"
                  isSoldOut={false}
                  name="Chips &amp; Salsa"
                  onToggle={() => {}}
                />
              </div>
            </div>
            <div className="flex items-center justify-center pt-4">
              <button className="flex items-center gap-2 px-6 py-3 rounded-full bg-[var(--primary-color)] text-white font-semibold hover:bg-red-700 transition-colors">
                <span className="material-symbols-outlined">add</span>
                Add New Item
              </button>
            </div>
          </main>
        </div>
        <footer className="sticky bottom-0 z-10" style={{ touchAction: 'none' }}>
          <div className="glassmorphism mx-4 mb-4">
            <div className="flex justify-around items-center py-2">
              <MobileNavLink
                className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined text-3xl">home</span>
                <span className="text-xs">Home</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                href="/@mobile/discover_food_trucks"
              >
                <span className="material-symbols-outlined text-3xl">map</span>
                <span className="text-xs">Map</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 text-[var(--primary-color)] hover:text-red-700 transition-colors"
                href="/@mobile/profile_&_menu_editor"
              >
                <span className="material-symbols-outlined text-3xl">edit_note</span>
                <span className="text-xs font-bold">Edit</span>
              </MobileNavLink>
              <MobileNavLink
                className="flex flex-col items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                href="/@mobile/user_profile"
              >
                <span className="material-symbols-outlined text-3xl">person</span>
                <span className="text-xs">Profile</span>
              </MobileNavLink>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
