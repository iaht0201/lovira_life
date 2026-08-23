import React from 'react';

export const HomeSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero Skeleton */}
      <div className="h-[250px] rounded-[28px] bg-[#F4EEFF]/60 border border-[#ECE8F5]" />

      {/* Quick Action Cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[130px] rounded-[18px] bg-[#FFFFFF] border border-[#ECE8F5] p-4 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#F4EEFF]" />
            <div className="w-24 h-4 rounded bg-[#ECE8F5]" />
            <div className="w-32 h-3 rounded bg-[#ECE8F5]" />
          </div>
        ))}
      </div>

      {/* Dashboard Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[280px] rounded-[22px] bg-[#FFFFFF] border border-[#ECE8F5] p-6 space-y-4">
          <div className="w-36 h-6 rounded bg-[#ECE8F5]" />
          <div className="h-16 rounded-xl bg-[#FAF9FC]" />
          <div className="h-16 rounded-xl bg-[#FAF9FC]" />
        </div>
        <div className="h-[280px] rounded-[22px] bg-[#FFFFFF] border border-[#ECE8F5] p-6 space-y-4">
          <div className="w-36 h-6 rounded bg-[#ECE8F5]" />
          <div className="h-14 rounded-xl bg-[#FAF9FC]" />
          <div className="h-14 rounded-xl bg-[#FAF9FC]" />
        </div>
      </div>
    </div>
  );
};
