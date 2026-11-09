"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast !bg-white !border !border-gray-200 !text-gray-900 !shadow-lg",
          title: "!text-inherit !font-semibold",
          description: "!text-inherit !opacity-90",
          success:
            "!bg-white !border-gray-200 !text-green-700 [&_[data-icon]]:!text-green-600 [&_svg]:!text-green-600",
          error:
            "!bg-white !border-gray-200 !text-red-600 [&_[data-icon]]:!text-red-600 [&_svg]:!text-red-600",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
