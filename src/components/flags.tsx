import Image from "next/image";

export const Flags = () => {
  return (
    <div className="mx-auto container max-w-7xl relative flex flex-col items-center justify-center overflow-hidden py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold dark:text-white">
          Where We Provide Service
        </h2>
        <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-300 mt-2">
          Serving Customers Across the United States
        </p>
        <p className="text-md sm:text-lg text-gray-500 dark:text-gray-400">
          We proudly offer our services across the U.S.
        </p>
      </div>

      <figure className="w-full px-4 sm:px-8">
        <div className="flex items-center justify-center">
          <Image
            src="/flags/usa.gif"
            alt="United States"
            width={700}
            height={700}
            className="object-contain"
          />
        </div>
        <figcaption className="mt-4 text-center text-xl font-semibold dark:text-white sm:text-2xl">
          United States
        </figcaption>
      </figure>
    </div>
  );
};

