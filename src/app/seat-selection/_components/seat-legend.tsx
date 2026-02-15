import { ChevronDown } from 'lucide-react';

const SeatLegend = () => {
  return (
    <div className="border border-gray-700 rounded-lg">
      <div className="container mx-auto px-4">
        <details className="py-4" open>
          <summary className="flex cursor-pointer items-center justify-between font-semibold text-white">
            <span>Seat Legend</span>
            <ChevronDown className="h-5 w-5 transition-transform duration-200 group-open:-rotate-180" />
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 rounded-md bg-[#4AA7F5]"></div>
              <span className="text-sm text-gray-300">Available (Standard)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 rounded-md bg-[#7658F6]"></div>
              <span className="text-sm text-gray-300">Available (VIP)</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 rounded-md bg-[#FF7513]"></div>
              <span className="text-sm text-gray-300">Selected</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 rounded-md bg-[#2A2A2A] flex items-center justify-center">
                <span className="text-white font-bold text-xs">X</span>
              </div>
              <span className="text-sm text-gray-300">Unavailable</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-5 w-5 rounded-md bg-[#0648B9]"></div>
              <span className="text-sm text-gray-300">Wheelchair Accessible</span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default SeatLegend;
