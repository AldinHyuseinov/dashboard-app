import Image from "next/image";

export default function Home() {
  return (
    <main className="w-full flex flex-col items-center mt-2">
      <section className="bg-gray-200">
        <Image src="/banner.jpg" alt="Vineyard landscape" width={1280} height={300} />
      </section>
    </main>
  );
}
