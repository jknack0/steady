// Type declarations for react-native imports that get aliased to react-native-web by the bundler.
// This provides basic types so TS doesn't error on the imports.
declare module "react-native" {
  import type { ComponentType, ReactNode } from "react";

  interface StyleProp {
    [key: string]: any;
  }

  interface ViewProps {
    style?: any;
    children?: ReactNode;
    [key: string]: any;
  }

  interface TextProps {
    style?: any;
    children?: ReactNode;
    [key: string]: any;
  }

  interface TouchableOpacityProps {
    style?: any;
    onPress?: () => void;
    disabled?: boolean;
    children?: ReactNode;
    [key: string]: any;
  }

  interface TextInputProps {
    style?: any;
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    multiline?: boolean;
    editable?: boolean;
    children?: ReactNode;
    [key: string]: any;
  }

  interface ScrollViewProps {
    style?: any;
    children?: ReactNode;
    [key: string]: any;
  }

  export const View: ComponentType<ViewProps>;
  export const Text: ComponentType<TextProps>;
  export const TouchableOpacity: ComponentType<TouchableOpacityProps>;
  export const TextInput: ComponentType<TextInputProps>;
  export const ScrollView: ComponentType<ScrollViewProps>;
}
