import React from 'react';

export default function FeaturedSpecialsComponent() {
  return (
    <section className="mt-8">
      <h2 className="text-white text-xl font-bold leading-tight tracking-tight px-4 mb-4">
        Featured Daily Specials
      </h2>
      <div className="flex overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pl-4 pr-4 gap-4">
        <div className="flex-shrink-0 w-48">
          <div className="relative rounded-2xl overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10 p-3">
            <div
              className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl mb-3"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAKhQLXGqdiNvOZaBL1HEW7t1zO4BHuH1fTBmG08_WVjk1l9IloG98D0PpnJp942CnyI64bLaEvaVTH7ow2dPLEt9WMGLVn719_vJM_DEXdNPAaJJ68f9Gz6PmN1x416GZqa1TnrtVataDkhatb9HZFxSsYoLasPCi5aTWl90P81IgnMJOw-287D2WR8NTuUEJSvEKn-xRBke72uX3zyDY97uLUu5043O4I5p-YbnUfNdVhtO5P3eHYa2ptIhy9kllZo_x4MM4j6jyT")',
              }}
            />
            <h3 className="text-white text-base font-semibold leading-tight">Taco Tuesday</h3>
            <p className="text-white/60 text-sm font-normal leading-normal">
              Delicious tacos at a discount
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 w-48">
          <div className="relative rounded-2xl overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10 p-3">
            <div
              className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl mb-3"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAdEabOCri9-daORQbn1P2lWK54tIw1lMGQ79GMvSHJrhmf_bcFx9vkhD5dCa7Vx4_G-1S3KBIxUjPATeHj2ex5JraDNwkvQn18OdjNaURMOrlbJSc9wtuo1WkI4_THJYaLX105fDPHo4dM2PGMpx2WIdLn7t9PG-5UgFilfowDRYDAV-7SYeGaK1m4iAthdxX6hZLchlIndywwc-a_3vw4pKD6UIYcZcd1E6lgtFru7kgpq1SG8jSXNFVVJQqEr9nKj812NFGPxcIf")',
              }}
            />
            <h3 className="text-white text-base font-semibold leading-tight">Burger Bonanza</h3>
            <p className="text-white/60 text-sm font-normal leading-normal">
              Juicy burgers with special toppings
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 w-48">
          <div className="relative rounded-2xl overflow-hidden bg-black/20 backdrop-blur-xl border border-white/10 p-3">
            <div
              className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-xl mb-3"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCaw4XhlOKRvxvH_-4BiZ_vwKq_xctg1KPCHihT5yVEJgEff9YliBfnaWRuTpb4XpOHK8nKCeYDQiWeXOwUgIhgbu383rMISyjeONSs8nEeA8tg_6hGm5UTDQSn43BgKIV2jKdCvV0eYOKv9Y1R7Wh6Q4lcWqlUYNcLHgrl0nkbKYkZnt_DsoYxwQY13WoM8NIavZZwnMN0ufDBpmsG5a4v4jCbBz9lnSd50FozWuGEtzouPxexTis3eUEZ95eFXoCgEKEF3p5kzgAv")',
              }}
            />
            <h3 className="text-white text-base font-semibold leading-tight">Pizza Party</h3>
            <p className="text-white/60 text-sm font-normal leading-normal">
              Authentic Italian pizza deals
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
