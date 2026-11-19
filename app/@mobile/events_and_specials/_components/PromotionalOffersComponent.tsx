import React from 'react';

export default function PromotionalOffersComponent() {
  return (
    <section className="mt-8 px-4 space-y-3">
      <h2 className="text-white text-xl font-bold leading-tight tracking-tight">
        Promotional Offers
      </h2>
      <div className="flex items-center gap-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBxMsGLGzvwO6s3vWoAzO-a59nz6K3LdnqE2V-j_xQCcYU9eybW6HpfaMvtAprxN2o6wezWCCO1GmBHhDbCajkUOtNWQnbDTJExaoMeQhlavU57GEqapcJfMySwnxZp1puPpyduis_UlGgtQLJHj7DicWaaGMJfAGihZdDMYE6jHVvXV6iDpGEgnosvhtzXAOfNeFEK_zb4HhMr3qFP60fEyjG3UiRO7CE55lvJse3QmIJNT22A4jtNUqybw9n3o_m9_FnITWld_P9A")',
          }}
        />
        <div className="flex flex-col justify-center">
          <p className="text-white text-base font-semibold leading-normal">New User Discount</p>
          <p className="text-white/60 text-sm font-normal leading-normal">
            10% off your first order
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-3">
        <div
          className="bg-center bg-no-repeat aspect-square bg-cover rounded-lg size-16"
          style={{
            backgroundImage:
              'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCtDBtJqHREO_YmRTC3hw-YDZ5cgJWC_9jqH9AliSzn7xzgcLw8Qa9j2u5QnD_jWJyrMhIgzLvh-b1e1JIPfssZ5VwEv09g4TQYS5493vmqZgmz90ZAUKVD-7F4l5bJSUzLXGQMBh-yoJUZpWqoZ_EVniqw01IXZMBC3R2lHWh-KZi1c73nwjWwndmglDx5aAU2UTU4_eDVl-U4ykfmOS4DB9seNaCvxYGVQZ66PpfaHeYnFPE-0smkLcNizo5a3YAru_2jBN8osFZG")',
          }}
        />
        <div className="flex flex-col justify-center">
          <p className="text-white text-base font-semibold leading-normal">Lunch Special</p>
          <p className="text-white/60 text-sm font-normal leading-normal">
            Free drink with any meal
          </p>
        </div>
      </div>
    </section>
  );
}
