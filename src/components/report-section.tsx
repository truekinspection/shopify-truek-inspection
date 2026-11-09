"use client";

import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/variants";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { handleReportRequest } from "@/actions/report";
import { useRouter } from "next/navigation";
import { zVinField, normalizeVin } from "@/lib/vin-validation";
import { zUsPhoneField } from "@/lib/phone-validation";

const formSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "First name must be at least 2 characters." }),
  lastName: z
    .string()
    .min(2, { message: "Last name must be at least 2 characters." }),
  email: z.string().email({ message: "Enter a valid email address." }),
  phoneNumber: zUsPhoneField,
  vnnumber: zVinField,
});

export const InspectionReportForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setUserData } = useUserStore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      vnnumber: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    const vinNorm = normalizeVin(values.vnnumber);
    const phoneNorm = values.phoneNumber;
    setUserData({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phoneNumber: phoneNorm,
      vnNumber: vinNorm,
    });

    localStorage.setItem("temp_vin", vinNorm);
    localStorage.setItem("temp_name", `${values.firstName} ${values.lastName}`);
    localStorage.setItem("temp_phone", phoneNorm);

    try {
      const response = await handleReportRequest({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phoneNumber: phoneNorm,
        vnNumber: vinNorm,
      });

      if (response.success === true) {
        toast.success("Form Submitted");
        router.push("/check-vin");
      } else {
        setIsSubmitting(false);
        toast.error("Error submitting form");
      }
    } catch (error: any) {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      className="py-6 px-4"
      id="report"
      variants={fadeIn("down", 0.2)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
    >
      <div
        className="container mx-auto max-w-6xl p-8 rounded-lg shadow-md flex flex-col lg:flex-row gap-12"
        id="get-report"
      >
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center lg:text-left">
            <h3 className="h2">TrueK Inspection Service</h3>
            <p className="text-lg text-gray-600">
              we <span className="font-bold text-[#06c668]">ensure</span> your car
              is in perfect condition.
            </p>
          </div>
          <div className="mt-10">
            <Image
              src="/carImage/car2.png"
              alt="Car Inspection"
              width={600}
              height={400}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1">
          <h2 className="h2">Get Your Report now</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">First Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter First Name"
                        {...field}
                        className="focus:ring-[#06c668]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">Last Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Last Name"
                        {...field}
                        className="focus:ring-[#06c668]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Your Email"
                        type="email"
                        {...field}
                        className="focus:ring-[#06c668]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">
                      Phone Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(212) 555-1212"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        {...field}
                        className="focus:ring-[#06c668]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vnnumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black font-semibold">Car VIN Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter VIN Number"
                        {...field}
                        className="focus:ring-[#06c668]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-fit bg-[#06c668] hover:bg-[#70c1e3] text-white font-semibold py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed border-none"
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </motion.section>
  );
};