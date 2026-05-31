import { redirect } from 'next/navigation';

/** Eski /app route'u yeni adrese yönlendirir. */
export default function AppRedirect() {
  redirect('/araclar/takbis-okuyucu');
}
