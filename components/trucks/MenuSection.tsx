import React, { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils/foodTruckHelpers';
import type { MenuItem } from '@/lib/supabase/types';
import './MenuSection.css';

interface MenuSectionProps {
  readonly popularItems: MenuItem[];
}

export function TruckMenuSection({ popularItems }: Readonly<MenuSectionProps>) {
  const categories = [...new Set(popularItems.map((item) => item.category ?? 'Menu'))];

  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map((cat) => [cat, false])),
  );

  useEffect(() => {
    const cats = [...new Set(popularItems.map((item) => item.category ?? 'Menu'))];
    setExpanded(Object.fromEntries(cats.map((cat) => [cat, false])));
  }, [popularItems]);

  const toggle = (cat: string) => {
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div>
      <h4 className="font-medium mb-2 text-sm dark:text-gray-100">Menu</h4>
      <div className="menu-section">
        <div className="menu-categories">
          {categories.map((cat) => (
            <div key={cat} className="menu-category">
              <button
                className="category-header"
                onClick={() => toggle(cat)}
                aria-expanded={expanded[cat] ?? false}
              >
                <h5 className="category-name">{cat}</h5>
                <span className="category-toggle">{expanded[cat] ? '−' : '+'}</span>
              </button>
              {expanded[cat] && (
                <div className="menu-items">
                  {popularItems
                    .filter((item) => (item.category ?? 'Menu') === cat)
                    .map((item, idx) => (
                      <div key={idx} className="menu-item">
                        <span className="item-name">{item.name}</span>
                        {item.price != null && (
                          <span className="item-price">{formatPrice(item.price)}</span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
