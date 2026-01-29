import { Button } from '@/components/ui/button';

interface ApplyButtonProps {
  onApply: () => void;
  isReady: boolean;
}

export function ApplyButton({ onApply, isReady }: ApplyButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full p-6 from-black via-black to-transparent pt-12 max-w-md mx-auto right-0 pointer-events-none z-30">
      <Button
        onClick={onApply}
        disabled={!isReady}
        className={`cursor-pointer pointer-events-auto w-full py-6 rounded-2xl font-bold text-base shadow-lg transition-all active:scale-[0.98] ${
          isReady
            ? 'bg-[#0066FF] hover:bg-[#0052cc] text-white shadow-blue-900/20'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        Apply
      </Button>
    </div>
  );
}
