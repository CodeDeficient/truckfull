import React from 'react';

export default function RewardsSection() {
  return (
    <div className="flex flex-col px-4">
      <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em] pb-3 pt-5">
        Available Rewards
      </h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex flex-[2_2_0px] flex-col gap-2">
            <p className="text-white text-base font-bold leading-tight">Free Drink</p>
            <p className="text-white/60 text-sm font-normal leading-normal">Redeem 500 points</p>
            <button className="flex mt-2 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal w-fit">
              <span className="truncate">Redeem</span>
            </button>
          </div>
          <div
            className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-xl"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDnU-y5GYsc2Iu6n7KCwv6lHLCX3x2fWt_Q88A1O5r7t2I4jq2o8jmcZ_LSDXUMghccnhFKW1uTWwlmTb0e1Jo_Agjdoaq-AaXaFFCU0PN-hhrt6Cr5sq9IodaBgI7Ohe5yk_2W27_Ds1mG1Ae2EJuA-XIfAnaZ1eIN2uZT1VtSbUzzyq4S4afIU6pMJ_pAMMC7KW41YiJ5xeKYwVhUTbEd5YNu9jjUlaiQRQ-hEnJPIka6YRFacNJB-ky9eXob5u8sQZBQT5RUcPZ0")',
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex flex-[2_2_0px] flex-col gap-2">
            <p className="text-white text-base font-bold leading-tight">10% Off</p>
            <p className="text-white/60 text-sm font-normal leading-normal">Redeem 1000 points</p>
            <button className="flex mt-2 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal w-fit">
              <span className="truncate">Redeem</span>
            </button>
          </div>
          <div
            className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-xl"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBT0nYM2Ypt_EHJxEDmgfRFAf287zvEPqxVJYaALOcQmpbmIrcDXZ8SLwXp5nYV2JTOEizUdsFTKEeeTS5hov9hw4ynCn_iFPyjv_ckWvr4atfX79DoC23dFw23fhQjVXc32UBEFmUSpKmnUFaa8rm12gNkhfBnX5zZZ6_uPNKLGDrnqhB1q5hKp292IGX6StQ-29PCRqAwzoAdGV5-scZxQCslDSe93OvTq869AXo-mqbjz8ZeiwFasPner74WJolCUbp597IQqGXP")',
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 p-4 backdrop-blur-xl">
          <div className="flex flex-[2_2_0px] flex-col gap-2">
            <p className="text-white text-base font-bold leading-tight">Free Meal</p>
            <p className="text-white/60 text-sm font-normal leading-normal">Redeem 2000 points</p>
            <button className="flex mt-2 min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-9 px-4 bg-[var(--primary-color)] text-white text-sm font-bold leading-normal w-fit">
              <span className="truncate">Redeem</span>
            </button>
          </div>
          <div
            className="w-24 h-24 bg-center bg-no-repeat bg-cover rounded-xl"
            style={{
              backgroundImage:
                'url("https://lh3.googleusercontent.com/aida-public/AB6AXuAYL8bnWz06JPliZhDv5b9sgXO0--EZbsivlj_CynMnITL9uaziL9iUo9-MyXR1vOB4Gkrgi3Vz_9eS7SZWHrogFt07YPQPtWYVktykzsXt11DOD8JcXg-dM19hTvWdQ-VDAGOGzo1ExiIhukUkk45nY8GIgyLaGLJf1PEZMz3uZ4TUyMqevAPWpAnulZ7TmKDzPm-AEsVoqZeaRV6b68GLv0sZXi13YYQn3Sbb2tHwjvCnomvlCSx4MFufPEvE312SQ78Q2sFUR5pv")',
            }}
          />
        </div>
      </div>
    </div>
  );
}
