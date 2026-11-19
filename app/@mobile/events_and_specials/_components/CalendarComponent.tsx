import React from 'react';

export default function CalendarComponent() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="flex w-full max-w-md flex-col gap-0.5">
        <div className="flex items-center p-1 justify-between">
          <button className="text-white flex size-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <p className="text-white text-base font-bold leading-tight flex-1 text-center">
            October 2024
          </p>
          <button className="text-white flex size-12 items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 text-center">
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            S
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            M
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            T
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            W
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            T
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            F
          </p>
          <p className="text-white/60 text-xs font-bold leading-normal tracking-wider flex h-12 w-full items-center justify-center pb-0.5">
            S
          </p>
          <button className="h-12 w-full text-white/50 col-start-4 text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">1</div>
          </button>
          <button className="h-12 w-full text-white/50 text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">2</div>
          </button>
          <button className="h-12 w-full text-white/50 text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">3</div>
          </button>
          <button className="h-12 w-full text-white/50 text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">4</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-bold leading-normal relative min-h-12">
            <div className="flex size-full items-center justify-center rounded-full bg-[var(--primary-color)]">
              5
            </div>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white" />
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">6</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">7</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">8</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">9</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">10</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">11</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">12</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">13</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">14</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">15</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">16</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">17</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">18</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">19</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">20</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">21</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">22</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">23</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">24</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">25</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">26</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">27</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">28</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">29</div>
          </button>
          <button className="h-12 w-full text-white text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">30</div>
          </button>
          <button className="h-12 w-full text-white/50 text-sm font-medium leading-normal min-h-12">
            <div className="flex size-full items-center justify-center rounded-full">31</div>
          </button>
        </div>
      </div>
    </div>
  );
}
