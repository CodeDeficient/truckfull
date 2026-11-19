import React from 'react';

interface FeaturedOfferCardProps {
  id: string;
  title: string;
  description: string;
  validUntil?: string;
  badgeText: string;
  badgeColor: string;
  onRedeemClick?: () => void;
}

const FeaturedOfferCard: React.FC<FeaturedOfferCardProps> = ({
  id: _id,
  title,
  description,
  validUntil,
  badgeText,
  badgeColor,
  onRedeemClick,
}) => {
  return (
    <div className="bg-black/30 rounded-xl p-3">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-white font-semibold">{title}</h4>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <span className={`${badgeColor} text-white text-xs font-bold px-2 py-1 rounded-full`}>
          {badgeText}
        </span>
      </div>
      {validUntil && <div className="mt-2 text-xs text-gray-500">Valid until: {validUntil}</div>}
      {onRedeemClick && (
        <div className="mt-3 flex justify-end">
          <button
            className="bg-[#ea2a2a] text-white text-sm font-medium px-3 py-1 rounded-full hover:bg-[#d42222] transition-colors"
            onClick={onRedeemClick}
          >
            Redeem
          </button>
        </div>
      )}
    </div>
  );
};

export default FeaturedOfferCard;
