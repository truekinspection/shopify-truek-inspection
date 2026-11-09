import { pricing } from "@/lib/constants";

export const Pricing = () => {
  return (
    <div className="min-h-screen py-6 px-4" id="pricing">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 space-y-6">
          <h3 className="text-sm font-semibold uppercase text-gray-600">
            Pricing
          </h3>
          <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">
            TrueK Inspection Plan
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose from our competitively priced plans, designed to fit your
            budget and meet your automotive needs.
          </p>
        </div>

        {/* Pricing Card */}
        <div
          className="relative bg-white rounded-2xl p-10 border border-gray-200 shadow-lg"
          style={{ maxWidth: 520, minHeight: 400, margin: "0 auto" }}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-custom_red rounded-t-2xl" />
          <div className="relative">
            <h3 className="text-custom_red text-2xl font-semibold mb-1">
              Our Plan
            </h3>
            {/* Price */}
            <div className="mb-4">
              <p className="text-gray-600 text-base">PRICE</p>
              <p className="text-4xl font-bold text-custom_red">
                {pricing[0].price}
              </p>
            </div>
            {/* Features List */}
            <div className="space-y-2 mb-4">
              {pricing[0].features.map((feature, i) => (
                <div key={i} className="flex items-start">
                  <span className="text-green-600 mr-2 text-xl">✔️</span>
                  <span className="text-gray-600 text-xl">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
