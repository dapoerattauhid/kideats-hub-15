import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, ArrowRight, CheckCircle, Smartphone, CreditCard, Bell } from 'lucide-react';

export default function Index() {
  const features = [
    { icon: Smartphone, title: 'Pesan Mudah', desc: 'Pesan makanan kapan saja dari HP' },
    { icon: CreditCard, title: 'Pembayaran Aman', desc: 'Berbagai metode pembayaran tersedia' },
    { icon: Bell, title: 'Notifikasi', desc: 'Update status pesanan real-time' },
    { icon: CheckCircle, title: 'Terpercaya', desc: 'Makanan sehat untuk anak Anda' },
  ];

  return (
    <div className="min-h-screen gradient-warm">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
            <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">MakanSekolah</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost">Masuk</Button>
          </Link>
          <Link to="/register">
            <Button variant="hero">Daftar</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 lg:py-24">
        <div className="text-center max-w-3xl mx-auto animate-slide-up">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            Pesan Makanan Sekolah
            <span className="text-primary"> Lebih Mudah</span>
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground mb-8">
            Platform pemesanan makanan sekolah terpercaya. Pastikan anak Anda mendapat nutrisi terbaik setiap hari.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button variant="hero" size="xl">
                Mulai Sekarang
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="xl">
                Sudah Punya Akun
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          {features.map((feature, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mb-4 shadow-primary">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-muted-foreground">
        <p>&copy; 2024 MakanSekolah. Semua hak dilindungi.</p>
      </footer>
    </div>
  );
}
