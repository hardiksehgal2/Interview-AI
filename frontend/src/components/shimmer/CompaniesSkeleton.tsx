
export const ShimmerGrid = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerCard key={i} />
          ))}
        </div>
      </div>
    );
  };
  

export const ShimmerCard = () => {
    return (
      <div className="animate-pulse rounded-xl bg-white p-4 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div className="h-12 w-12 rounded-full bg-gray-300" />
          <div className="h-6 w-12 rounded bg-gray-300" />
        </div>
        <div className="h-4 w-3/4 bg-gray-300 rounded mb-2" />
        <div className="h-4 w-1/2 bg-gray-300 rounded mb-4" />
        <div className="flex gap-2 items-center mb-2">
          <div className="h-4 w-4 rounded-full bg-gray-300" />
          <div className="h-4 w-20 bg-gray-300 rounded" />
        </div>
        <div className="flex gap-2 items-center mb-2">
          <div className="h-4 w-4 rounded-full bg-gray-300" />
          <div className="h-4 w-24 bg-gray-300 rounded" />
        </div>
        <div className="flex gap-2 items-center mb-4">
          <div className="h-4 w-4 rounded-full bg-gray-300" />
          <div className="h-4 w-28 bg-gray-300 rounded" />
        </div>
        <div className="h-4 w-32 bg-gray-300 rounded mb-4" />
        <div className="h-10 w-24 bg-gray-300 rounded" />
      </div>
    );
  };
  