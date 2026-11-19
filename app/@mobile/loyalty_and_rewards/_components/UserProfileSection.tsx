import React from 'react';

export default function UserProfileSection() {
  return (
    <div className="flex p-4 @container">
      <div className="flex w-full flex-col gap-4 items-center">
        <div className="flex gap-4 flex-col items-center">
          <div className="relative">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full min-h-32 w-32"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDvpy5rGvUjXr4tG8GbjMZm6TVpfSWStTXPxfFnh4OZVzGLRdugNUHYd5x2tHkjKugFS9efnrDVXT8gvEduYQgK3oNlJqgUVdBxhmIkZbJWvOnjrag3WIC2DVUY1AzCn3w10AqMwsvmpJpDm89m0t0N-AHmXXbUATzdGXsDf4TGIKq1ceQ4GKbwGyLIV1AWjVE7XM88H6g4C7WHnPXoSZtBkMHey40dSchQAckOQo8ulg_P7JnmBKGO_SLGmf2BxOpaYfdZQDSO0H_E")',
              }}
            />
            <div className="absolute -bottom-2 right-0 flex items-center justify-center rounded-full bg-[var(--primary-color)] p-2 text-white">
              <span className="material-symbols-outlined">stars</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center justify-center">
            <p className="text-white text-[22px] font-bold leading-tight tracking-[-0.015em] text-center">
              Sophia Chen
            </p>
            <p className="text-white/70 text-base font-normal leading-normal text-center">
              1,250 points
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
