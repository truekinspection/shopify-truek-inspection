import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  vnNumber: string;
  setUserData: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    vnNumber: string;
  }) => void;
  clearUserData: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      vnNumber: "",
      setUserData: (data) => set(data),
      clearUserData: () =>
        set({
          firstName: "",
          lastName: "",
          email: "",
          phoneNumber: "",
          vnNumber: "",
        }),
    }),
    {
      name: "user-storage",
    },
  ),
);
