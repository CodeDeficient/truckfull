import React from 'react';
import StarRating from '@/components/ui/molecules/StarRating';
import ReviewItem from '@/components/ui/molecules/ReviewItem';
import GenericHeader from '@/components/ui/organisms/GenericHeader';
import GenericBottomNavigation from '@/components/ui/organisms/GenericBottomNavigation';
import PageHead from '@/components/ui/organisms/PageHead';

const handleBack = () => {
  globalThis.history.back();
};

export default function ReviewsAndRatings() {
  return (
    <>
      <PageHead title="Reviews" />

      <div
        className="relative flex size-full min-h-screen flex-col bg-[#111111] dark justify-between group/design-root"
       
      >
        <div className="flex-grow">
          <GenericHeader title="Reviews" onBack={handleBack} />

          <main className="p-4 space-y-8">
            <section className="p-6 glassmorphism rounded-2xl">
              <div className="flex flex-wrap gap-x-8 gap-y-6 items-center">
                <div className="flex flex-col gap-2 items-center">
                  <p className="text-white text-5xl font-black leading-tight tracking-[-0.033em]">
                    4.5
                  </p>
                  <StarRating rating={4.5} size="lg" />
                  <p className="text-white/60 text-sm font-normal leading-normal">120 reviews</p>
                </div>
                <div className="grid min-w-[200px] max-w-[400px] flex-1 grid-cols-[20px_1fr_40px] items-center gap-x-3 gap-y-2">
                  <p className="text-white text-sm font-normal leading-normal">5</p>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="rounded-full bg-[var(--primary-color)]"
                      style={{ width: '40%' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm font-normal leading-normal text-right">40%</p>
                  <p className="text-white text-sm font-normal leading-normal">4</p>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="rounded-full bg-[var(--primary-color)]"
                      style={{ width: '30%' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm font-normal leading-normal text-right">30%</p>
                  <p className="text-white text-sm font-normal leading-normal">3</p>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="rounded-full bg-[var(--primary-color)]"
                      style={{ width: '15%' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm font-normal leading-normal text-right">15%</p>
                  <p className="text-white text-sm font-normal leading-normal">2</p>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="rounded-full bg-[var(--primary-color)]"
                      style={{ width: '10%' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm font-normal leading-normal text-right">10%</p>
                  <p className="text-white text-sm font-normal leading-normal">1</p>
                  <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="rounded-full bg-[var(--primary-color)]"
                      style={{ width: '5%' }}
                    />
                  </div>
                  <p className="text-white/60 text-sm font-normal leading-normal text-right">5%</p>
                </div>
              </div>
              <button className="mt-6 w-full text-center bg-[var(--primary-color)] text-white font-bold py-3 rounded-lg hover:bg-red-700 transition-colors">
                Write a Review
              </button>
            </section>
            <section>
              <h2 className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] px-4 pb-3 pt-5">
                All Reviews (120)
              </h2>
              <div className="flex flex-col gap-6">
                <ReviewItem
                  name="Liam Carter"
                  date="2 weeks ago"
                  rating={5}
                  review="The food was absolutely amazing! Best tacos I've ever had. The service was quick and friendly. Highly recommend!"
                  likes={25}
                  dislikes={5}
                  avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuCmn_sRi_2bgZ1llvcErOf--DY1CSIHzC1hQDNltZ60CtPNXkxeLzzLSjaQdCNOcMN--IFVoyJzTvFIb9PnOT3gZ31JhU4XaTUDIVrQ58UiG1tq8sJ1JdVnjreMMka4FzEFgp0BwV-hA0j441ZdKgPwwvxv0usSTvNGn6qoPuYAjjUtiJp75wpV6GNTywvef9zPxL6S_3lUBk_XqSs1WwtvKSTXgG03hMXIuVEL4Elvshg9yzVcr2lnh09s6zic-4C3dOxdhAtzxh4s"
                />
                <ReviewItem
                  name="Sophia Bennett"
                  date="1 month ago"
                  rating={4}
                  review="Great food truck with a variety of options. The prices are reasonable, and the quality is top-notch. Will definitely be back."
                  likes={18}
                  dislikes={3}
                  avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuATDDnC9RplWlHXeRkukq97dqMDUxv2m1ng0eB7N1m54R9Fsv64u047yjleuuhdSm8h5urGfDLIaDayu8AXTA2JFedR9cVhEXBl0kKL_wq2zWfmLCG_x4XpgC4UbrGLgklZ5mfeUz92yziwFoYPlApt3amXZr4DCxpXPfXZXTimA7pXSLMdlMzR6u3UaY2mhEc_hjKFLQxwkkWuwpVsHovUDFdaSw3XYwDDfhc2hgh2r0aS2wxUySrb-zaewAfx1uuQZv9vzOnnq_BC"
                />
                <ReviewItem
                  name="Ethan Walker"
                  date="2 months ago"
                  rating={3}
                  review="Good food truck but had to wait a bit long. Food quality is decent but service could be improved."
                  likes={12}
                  dislikes={8}
                  avatarUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuB4Zbl-bIlxZZUh6Ppn9XU7SANCLuM0cBJVo1HKXociZe4SZjmiIu9X_8hVK3BpQnmSgR9-ZPbpMUa_1eNiTn7uUYnxpXts4hDnt5MSAImGsHh7GKjBtWVmrzBSLUVurMAi7ctVSFDAGfUrwhRy8UWyvPAphvDvVg4QPRbsrT37dpYYyPQ8DtkJkuE1Z9dWfccy3OdQeX9M1-0ppr4DPfmgKCiw8U_P1RjfRQB8lXxVOGbqw9Tm39KP8EW6LJIi3kcvJGSsx69UU0p5"
                />
              </div>
            </section>
          </main>
        </div>
        <GenericBottomNavigation items={[]} />
      </div>
    </>
  );
}
