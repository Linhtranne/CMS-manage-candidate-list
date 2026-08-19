import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import type { Route } from 'next';
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-control px-4 py-2 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-white hover:bg-[#1e4e8d]',
        secondary: 'border border-border bg-panel text-text hover:bg-surface',
        ghost: 'text-text-muted hover:bg-surface hover:text-text',
        danger: 'bg-danger text-white hover:bg-[#941f16]'
      },
      size: {
        sm: 'min-h-9 px-3 text-xs',
        md: 'min-h-10',
        lg: 'min-h-11 px-5'
      }
    },
    defaultVariants: { variant: 'secondary', size: 'md' }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);

Button.displayName = 'Button';

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, 'className' | 'href'> & VariantProps<typeof buttonVariants> & { href: string; className?: string };

export function ButtonLink({ className, variant, size, href, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} href={href as Route} {...props} />;
}
