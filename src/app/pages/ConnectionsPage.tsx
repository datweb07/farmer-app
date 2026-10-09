import SponsorsSlider from "../components/SponsorsSlider";

export function ConnectionsPage() {
  return (
    <div className="min-h-[calc(100vh-7rem)] bg-gray-50 flex flex-col">
      <div className="flex-1" aria-hidden="true" />
      <div className="w-full max-w-7xl mx-auto px-4 pb-8">
        <SponsorsSlider />
      </div>
    </div>
  );
}
