export default function AdminDashboardLoading() {
  return (
    <main className="px-5 py-7 sm:px-7 sm:py-9 xl:px-10">
      <div className="mx-auto max-w-[1280px] animate-pulse">
        <div className="h-8 w-56 bg-[#deded9]" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-36 border border-[#deded9] bg-white" />
          ))}
        </div>
        <div className="mt-7 h-80 border border-[#deded9] bg-white" />
      </div>
    </main>
  );
}
