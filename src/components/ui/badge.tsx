import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-2xs font-medium uppercase tracking-wide',
  {
    variants: {
      variant: {
        neutral: 'border-line bg-white/[0.04] text-fg-muted',
        accent: 'border-accent/30 bg-accent-subtle text-accent',
        warning: 'border-warning/30 bg-warning-subtle text-warning',
        danger: 'border-danger/30 bg-danger-subtle text-danger',
        solid: 'border-transparent bg-accent text-accent-fg',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
