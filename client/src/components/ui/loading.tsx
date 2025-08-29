import { cn } from "@/lib/utils";

interface LoadingProps {
  isLoading: boolean;
  className?: string;
}

export function Loading({ isLoading, className }: LoadingProps) {
  if (!isLoading) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm",
      className
    )}>
      <div className="relative">
        {/* Rotating circles */}
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-spin">
            <div className="h-full w-full rounded-full border-4 border-transparent border-t-[#4A90E2] border-r-[#2E5BFF]"></div>
          </div>
          <div className="absolute inset-0 animate-spin-reverse">
            <div className="h-full w-full rounded-full border-4 border-transparent border-b-[#4A90E2] border-l-[#2E5BFF]"></div>
          </div>
        </div>
        
        {/* Loading text */}
        <p className="mt-4 text-center text-lg font-medium text-gray-700 dark:text-gray-300">
          Loading...
        </p>
      </div>
    </div>
  );
}