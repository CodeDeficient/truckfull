import React from 'react';

interface FeaturedContentSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  gradientClass?: string;
  borderColor?: string;
}

const FeaturedContentSection: React.FC<FeaturedContentSectionProps> = ({
  title,
  icon,
  children,
  gradientClass = 'from-[#ea2a2a]/20 to-purple-900/20',
  borderColor = 'border-white/10',
}) => {
  return (
    <section className={`bg-gradient-to-br ${gradientClass} rounded-xl p-2 border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-white text-sm font-bold">{title}</h3>
      </div>
      {children}
    </section>
  );
};

export default FeaturedContentSection;
