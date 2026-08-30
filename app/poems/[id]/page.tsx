import { PoemReader } from '@/components/poetry/poem-reader';

export default async function PoemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PoemReader id={id} />;
}
