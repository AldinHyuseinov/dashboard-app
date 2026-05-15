import Alert from "@/components/notification/Alert";
import { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Avexim Communication | Начало",
};

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center mt-2">
      <Suspense fallback={null}>
        <Alert />
      </Suspense>

      <section className="bg-gray-200">
        <Image src="/banner.jpg" alt="Vineyard landscape" width={1280} height={300} />
      </section>
    </main>
  );
}
