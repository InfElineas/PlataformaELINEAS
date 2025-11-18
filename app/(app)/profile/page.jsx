import ProfileForm from '@/components/profile/ProfileForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getSessionFromCookies } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const session = await getSessionFromCookies();
  if (!session?.user) {
    redirect('/login');
  }

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    redirect('/login');
  }

  const initialData = {
    full_name: user.full_name,
    email: user.email,
    username: user.username,
    phone: user.phone || '',
    language: user.language || 'es',
    timezone: user.timezone || 'UTC',
    avatar_url: user.avatar_url || ''
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">Actualiza tu información personal y preferencias.</p>
      </div>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm initialData={initialData} />
        </CardContent>
      </Card>
    </div>
  );
}
