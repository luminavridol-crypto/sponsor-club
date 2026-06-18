export default function TelegramLoading() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#17151d_0%,#111119_42%,#0c0d13_100%)] px-4 py-3 text-white">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="mt-3 h-8 w-44 rounded-full bg-white/10" />
          <div className="mt-3 h-10 w-24 rounded-full bg-white/10" />
        </div>

        <div className="space-y-3">
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-4/5 rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-full rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-3/5 rounded-full bg-white/10" />
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-2/3 rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-full rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-5/6 rounded-full bg-white/10" />
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
            <div className="h-3 w-20 rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-3/4 rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-full rounded-full bg-white/10" />
            <div className="mt-2 h-4 w-2/3 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
