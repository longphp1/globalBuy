import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HowToGuide } from "@/components/HowToGuide";
import { getSite } from "@/lib/catalog";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ site: string }>;
}): Promise<Metadata> {
  const { site: slug } = await params;
  const site = getSite(slug);
  return { title: site ? `${site.name} How-To` : "How-To" };
}

export default async function HowToPage({ params }: { params: Promise<{ site: string }> }) {
  const { site: slug } = await params;
  const site = getSite(slug);
  if (!site) notFound();
  return <HowToGuide site={site} />;
}
