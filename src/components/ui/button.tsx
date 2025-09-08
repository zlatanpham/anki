import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer relative",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={isLoading || props.disabled}
    >
      {React.Children.map(children, (child) => {
        if (typeof child === "string" || typeof child === "number") {
          return (
            <span className={cn(isLoading && "pointer-events-none opacity-0")}>
              {child}
            </span>
          );
        }
        if (React.isValidElement(child)) {
          const childProps = child.props as Record<string, unknown>;
          return React.cloneElement(child, {
            ...childProps,
            className: cn(
              (childProps as { className?: string })?.className,
              isLoading && "pointer-events-none opacity-0",
            ),
          } as React.HTMLAttributes<HTMLElement>);
        }
        return child;
      })}
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="animate-spin" />
        </span>
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
