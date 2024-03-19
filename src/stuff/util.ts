import "react";

export type SetStateType<T> = React.Dispatch<React.SetStateAction<T>>;

// thanks https://stackoverflow.com/questions/52005083/how-to-define-css-variables-in-style-attribute-in-react-and-typescript
// add support for css variables for react inline styles
declare module "react" {
  interface CSSProperties {
    //[key: `--${string}`]: string | number
    "--snap"?: string;
    "--scale"?: string;
  }
}
