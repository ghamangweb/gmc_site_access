import Image from "next/image";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden">
      <Image
        src="/bg-auth.jpg"
        alt=""
        fill
        priority
        className="object-cover brightness-50"
      />
      <main className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-10 rounded-3xl bg-card px-16 py-24 text-center">
        <Image
          src="/logo_whitebg.png"
          alt="GMC logo"
          width={120}
          height={20}
          priority
          className="dark:hidden"
        />
        <Image
          src="/logo.png"
          alt="GMC logo"
          width={120}
          height={20}
          priority
          className="hidden dark:block"
        />
        {children}
      </main>
    </div>
  );
}
