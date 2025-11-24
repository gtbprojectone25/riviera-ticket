import { Button } from '@/components/ui/button';

interface ApplyButtonProps {
  onApply: () => void;
  isReady: boolean;
}

export function ApplyButton({ onApply, isReady }: ApplyButtonProps) {
  return (
    <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent pt-10 max-w-md mx-auto right-0 pointer-events-none z-30">
      <Button
        onClick={onApply}
        disabled={!isReady}
        className={`pointer-events-auto w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
          isReady
            ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-blue-900/30 hover:from-blue-500 hover:to-blue-300'
            : 'bg-[#2A2A2A] text-[#555] cursor-not-allowed'
        }`}
      >
        Apply
      </Button>
    </div>
  );
}
