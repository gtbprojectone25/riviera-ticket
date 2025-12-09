'use client';

import { Button } from '@/components/ui/button';

interface ApplyButtonProps {
  onClick: () => void;
  disabled: boolean;
}

const ApplyButton = ({ onClick, disabled }: ApplyButtonProps) => {
  return (
    <div className="fixed bottom-40 left-0 right-0 p-4">
        <Button
            onClick={onClick}
            disabled={disabled}
            className="w-full bg-linear-to-r from-blue-500 to-purple-600 text-white font-bold py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
        >
            Apply
        </Button>
    </div>
  );
};

export default ApplyButton;
