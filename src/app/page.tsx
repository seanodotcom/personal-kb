import ClientHome from './ClientHome';
import { getThoughts } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const thoughts = await getThoughts();
  return <ClientHome initialThoughts={thoughts} />;
}
