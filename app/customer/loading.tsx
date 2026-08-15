export default function CustomerDashboardLoading() {
  return (
    <main className="min-h-screen bg-[#f5f5f2] px-5 py-24 sm:px-7">
      <div className="mx-auto max-w-[1120px] animate-pulse">
        <div className="h-8 w-64 bg-[#deded9]" />
        <div className="mt-7 h-32 bg-[#e8e8e3]" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => <div key={item} className="h-32 border border-[#deded9] bg-white" />)}
        </div>
      </div>
    </main>
  );
}
