
"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { handleContactForm } from "@/actions/contact";
import { zVinField } from "@/lib/vin-validation";

// Form Schema
const formSchema = z.object({
  firstName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  lastName: z
    .string()
    .min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  vnnumber: zVinField,
  message: z
    .string()
    .min(10, { message: "Message must be at least 10 characters." }),
});

export const ContactSection = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { firstName, lastName, email, vnNumber, setUserData } = useUserStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: firstName || "",
      lastName: lastName || "",
      email: email || "",
      vnnumber: vnNumber || "",
      message: "",
    },
  });

  // Update form when store data changes
  useEffect(() => {
    form.setValue("firstName", firstName || "");
    form.setValue("lastName", lastName || "");
    form.setValue("email", email || "");
    form.setValue("vnnumber", vnNumber || "");
  }, [firstName, lastName, email, vnNumber, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    // Update store with new values
    setUserData({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      vnNumber: values.vnnumber,
    });

    try {
      const response = await handleContactForm(values);

      if (response.success) {
        form.reset();
        toast.success("Form Submitted", {
          description: "Thank you for submitting the form.",
        });
      } else {
        toast.error("Submission Failed", {
          description: "An error occurred. Please try again.",
        });
      }
    } catch (error) {
      console.error("Error submitting form", error);
      toast.error("Submission Error", {
        description: "An unexpected error occurred. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="mb-20 py-10 px-2 bg-custom_red">
      {/* Centered Section Heading */}
      <div className="text-center mb-12 pt-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white drop-shadow">
          Contact Us
        </h2>
        <p className="text-lg text-white max-w-2xl mx-auto">
          Have questions or need assistance? Contact us today for personalized
          support and expert guidance on all things automotive.
        </p>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-0 md:p-10">
        {/* Left Content */}
        <div className="flex flex-col justify-start h-full py-10 px-6 md:px-10">
          <h3 className="text-3xl md:text-4xl font-extrabold mb-6 text-custom_red">
            Get in Touch
          </h3>
          <p className="text-gray-700 mb-6 text-lg">
            We are here to help you with any queries or support you need
            regarding our services. Our team responds quickly!
          </p>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-gray-900 text-lg">Email:</span>
            <a
              href="mailto:contact@TrueKinspection.com"
              className="text-custom_red underline text-lg font-medium"
            >
              contact@TrueKinspection.com
            </a>
          </div>
        </div>

        {/* Right Contact Form */}
        <div className="py-10 px-6 md:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* First Name and Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">
                        First Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter First Name"
                          {...field}
                          className="focus:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage className="text-white" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">
                        Last Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Last Name"
                          {...field}
                          className="focus:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage className="text-white" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email and VIN Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Your Email"
                          {...field}
                          className="focus:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage className="text-white" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vnnumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-semibold">
                        Car VIN Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter VIN Number"
                          {...field}
                          className="focus:ring-red-500"
                        />
                      </FormControl>
                      <FormMessage className="text-white" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Message */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white font-semibold">
                      Message
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="bg-white min-h-[150px]"
                        placeholder="Enter Your Message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-white" />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-fit bg-neutral-800 hover:bg-neutral-900/90 text-white font-semibold py-2 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
};
