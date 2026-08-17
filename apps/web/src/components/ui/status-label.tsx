import { cva, type VariantProps } from 'class-variance-authority';
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const statusLabelVariants = cva('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', {
  variants: {
    tone: {
      neutral: 'bg-surface text-text-muted',
      info: 'bg-[#e8f1fb] text-accent',
      success: 'bg-[#e8f5ee] text-success',
      warning: 'bg-[#fff3dc] text-warning',
      danger: 'bg-[#fdecea] text-danger'
    }
  },
  defaultVariants: { tone: 'neutral' }
});

export type StatusLabelProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof statusLabelVariants>;

export function StatusLabel({ children, className, tone, ...props }: StatusLabelProps) {
  return (
    <span className={cn(statusLabelVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}
