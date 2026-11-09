"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Award, Shield, HandshakeIcon } from "lucide-react";
import { motion } from "framer-motion";
import { fadeIn } from "@/lib/variants";

export const WhyUs = () => {
  const features = [
    {
      icon: Award,
      title: "Expertise",
      description:
        "Benefit from our knowledgeable team for informed decisions.",
    },
    {
      icon: Shield,
      title: "Trustworthy Information",
      description: "Rely on accurate data for peace of mind.",
    },
    {
      icon: HandshakeIcon,
      title: "Dependable Support",
      description:
        "Count on us for consistent, reliable assistance throughout your automotive journey.",
    },
  ];

  return (
    <motion.section
      id="whyus"
      className="flex items-center my-20"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.6 }}
    >
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Text Content */}
          <motion.div
            className="space-y-6"
            variants={fadeIn("left", 0.2)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                WHY CHOOSE US
              </h2>
              <h3 className="text-3xl font-bold tracking-tight text-gray-900 md:text-5xl">
                Expertise. Trust. Reliability.
              </h3>
            </div>
            <p className="text-base md:text-lg leading-relaxed text-gray-600">
              Your Trusted Automotive Partner: Reliable expertise, accurate
              data, and consistent support for a smooth automotive journey.
            </p>
          </motion.div>

          {/* Center Image */}
          <motion.div
            className="relative"
            variants={fadeIn("up", 0.3)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            <Image
              src={"/images/why/officer.png"}
              alt="Automotive professional"
              width={500}
              height={400}
              className="rounded-lg object-cover"
            />
          </motion.div>

          {/* Feature Cards */}
          <motion.div
            className="space-y-4"
            variants={fadeIn("right", 0.4)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeIn("up", 0.3 * (index + 1))}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.6 }}
              >
                <Card className="bg-custom_red p-4 text-white">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-custom_red/20 p-2">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-base md:text-lg font-semibold">{feature.title}</h4>
                      <p className="text-sm text-blue-100">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};
