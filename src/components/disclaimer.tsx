import Image from "next/image";

export const Disclaimer = () => {
  return (
    <div className="w-full bg-[#faf7f8] py-6">
      {/* Top Description */}
      <p className="text-center text-gray-700 text-base mb-4 px-2">
        The TrueK Inspection Report is compiled using data from the industry's
        most trusted providers and specialists, including ClearVin data and
        Black Book market valuation references, ensuring high standards of
        accuracy and reliability.
      </p>

      {/* Logos Row */}
      <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 mb-8">
        <Image
          src="/companies/5.png"
          alt="Kelley Blue Book"
          className="h-16 object-contain"
          width={150}
          height={200}
        />
        <Image
          src="/companies/4.png"
          alt="Black Book"
          className="h-10 object-contain"
          width={150}
          height={200}
        />
      </div>

      {/* Disclaimer Section */}
      <div className="w-full bg-white bg-opacity-60 py-12 px-2 flex flex-col items-center justify-center">
        <h2 className="text-4xl font-serif font-bold text-black mb-2">
          Disclaimer
        </h2>
        <div className="w-20 h-1 bg-red-600 rounded-full mb-6" />
        <p className="text-center text-lg font-semibold text-gray-900 max-w-4xl">
          Dear loyal customers, our reports are prepared using licensed data
          sources, including ClearVin and Black Book references, to provide
          accurate and comprehensive vehicle information.
        </p>
      </div>
    </div>
  );
};
