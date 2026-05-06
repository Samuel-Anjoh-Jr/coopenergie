declare module "@radix-ui/react-aspect-ratio" {
  import * as React from "react";

  export interface AspectRatioProps
    extends React.HTMLAttributes<HTMLDivElement> {
    ratio?: number;
    asChild?: boolean;
  }

  export const Root: React.ForwardRefExoticComponent<
    AspectRatioProps & React.RefAttributes<HTMLDivElement>
  >;
}
