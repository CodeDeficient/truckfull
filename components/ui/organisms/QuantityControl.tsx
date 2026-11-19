import React from 'react';

interface QuantityControlProps {
  readonly itemName: string;
  readonly quantity: number;
  readonly onQuantityChange: (itemName: string, quantity: number) => void;
}

export default function QuantityControl({
  itemName,
  quantity,
  onQuantityChange,
}: QuantityControlProps) {
  const handleIncrement = () => {
    onQuantityChange(itemName, quantity + 1);
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      onQuantityChange(itemName, quantity - 1);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleDecrement}
        className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
      >
        <span className="text-gray-700 font-bold">-</span>
      </button>
      <span className="w-8 text-center font-medium">{quantity}</span>
      <button
        onClick={handleIncrement}
        className="w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
      >
        <span className="font-bold">+</span>
      </button>
    </div>
  );
}
