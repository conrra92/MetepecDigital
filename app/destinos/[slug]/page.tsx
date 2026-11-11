import DestinoDetalle from "../../interfaces/DestinoDetalle";

type DestinoDetallePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function DestinoDetallePage({ params }: DestinoDetallePageProps) {
  const { slug } = await params;

  return <DestinoDetalle slug={slug} />;
}