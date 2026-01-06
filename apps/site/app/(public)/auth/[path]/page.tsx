import { AuthView } from '@daveyplate/better-auth-ui';
import Image from 'next/image';
import { getConfig } from '@/lib/config';

const { app } = getConfig();

export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <div className="flex flex-col justify-center items-center h-screen w-screen ">
      <div className="flex items-center gap-2 mb-4">
        <Image
          src="/favicon.ico"
          alt={app.name!}
          width={32}
          height={32}
          priority
        />
        <span className="text-xl font-semibold">{app.name}</span>
      </div>
      <AuthView path={path} />
    </div>
  );
}
