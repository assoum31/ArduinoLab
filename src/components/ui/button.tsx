import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-xl sm:rounded-lg text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00878F] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[#00878F] text-white hover:bg-[#006d73] shadow-sm',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
        outline:
          'border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
        ghost:
          'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
        destructive:
          'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
        success:
          'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
      },
      size: {
        default: 'min-h-[44px] sm:min-h-0 h-11 sm:h-9 px-4 py-2',
        sm: 'min-h-[40px] sm:min-h-0 h-10 sm:h-8 px-3 text-xs',
        lg: 'min-h-[48px] sm:min-h-0 h-12 sm:h-10 px-5 text-sm',
        icon: 'h-11 w-11 sm:h-9 sm:w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
