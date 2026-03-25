import React, { useState, useEffect } from 'react';
import { ShoppingCart, MapPin, Truck, CheckCircle, Package, Phone, Search, ChevronRight, Plus, Minus, User, FileText, LogOut, Settings, ListOrdered, Menu, X, BarChart3, Calculator, Edit, Trash2, ChevronLeft, PauseCircle, Send, FileBarChart, Receipt, Bell, Calendar, Filter } from 'lucide-react';

// --- KONFIGURASI PENTING ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxLxqx4PnD65_tIqQLYdkW489e4dllyFORvtrh32e8DaV_gFM3hu3UP4APCe7fw48aI/exec';

// --- DATA INITIAL ---
const INITIAL_PRODUCTS = [
  { id: 1, name: 'DRIZCE Galon 19L', price: 18000, unit: 'Galon', image: 'https://drive.google.com/file/d/1bBSfC2ruXcXNBoXyMZoLjWnnNMn3CDeD/view' },
  { id: 2, name: 'DRIZCE 600ml', price: 40000, unit: 'Dus', image: 'https://drive.google.com/file/d/1bBSfC2ruXcXNBoXyMZoLjWnnNMn3CDeD/view' },
  { id: 3, name: 'DRIZCE 1.5L', price: 40000, unit: 'Dus', image: 'https://drive.google.com/file/d/1bBSfC2ruXcXNBoXyMZoLjWnnNMn3CDeD/view' }
];

const INITIAL_DISTRIBUTORS = [
  { id: 1, area: 'Gubeng', name: 'DRIZCE Gubeng', phone: '6281234567890' },
  { id: 2, area: 'Sukolilo', name: 'DRIZCE Sukolilo', phone: '6289876543210' },
  { id: 3, area: 'Mulyorejo', name: 'DRIZCE Mulyorejo', phone: '6281112223334' },
  { id: 4, area: 'Wonokromo', name: 'DRIZCE Wonokromo', phone: '6284445556667' }
];

const INITIAL_ORDERS = [
  { id: 'ORD-10293', date: '13 Mar 2026, 10:30', timestamp: '2026-03-13T10:30:00', type: 'online', customer: 'Firman', phone: '08123456789', address: 'Jl. Merdeka No. 123', area: 'Sukolilo', distributor: 'DRIZCE Sukolilo', itemsText: '2x DRIZCE 600ml', total: 80000, status: 'proses' }
];

// --- FUNGSI HELPER GOOGLE DRIVE (VERSI TERBARU ANTI-BLOKIR) ---
const getDirectImageUrl = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const id = url.split('/d/')[1].split('/')[0];
    // Format lh3 adalah format direct link Google API yang paling stabil saat ini
    return `https://lh3.googleusercontent.com/d/${id}`;
  }
  return url;
};

export default function App() {
  // STATE DATABASE UTAMA
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [distributors, setDistributors] = useState(INITIAL_DISTRIBUTORS);
  const [orders, setOrders] = useState(INITIAL_ORDERS);

  const [cart, setCart] = useState([]);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', kecamatan: '' });
  const [selectedDistributorObj, setSelectedDistributorObj] = useState(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState(null); 

  const [currentView, setCurrentView] = useState('home'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State untuk Menu HP

  const [siteConfig, setSiteConfig] = useState({
    logo: 'https://drive.google.com/file/d/1bBSfC2ruXcXNBoXyMZoLjWnnNMn3CDeD/view',
    heroImage: 'https://drive.google.com/file/d/1bBSfC2ruXcXNBoXyMZoLjWnnNMn3CDeD/view',
    headline: 'Air Sehat, Langsung\nDari Distributor Terdekat',
    subheadline: 'Pesan mudah, kirim dari distributor terdekat kecamatan Anda. Hexagonal - Bio - Fir.'
  });

  useEffect(() => {
    if (formData.kecamatan) {
      const dist = distributors.find(d => d.area === formData.kecamatan);
      setSelectedDistributorObj(dist || null);
    } else {
      setSelectedDistributorObj(null);
    }
  }, [formData.kecamatan, distributors]);

  const updateCart = (product, change) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        const newQty = existing.qty + change;
        if (newQty <= 0) return prev.filter(item => item.id !== product.id);
        return prev.map(item => item.id === product.id ? { ...item, qty: newQty } : item);
      }
      if (change > 0) return [...prev, { ...product, qty: 1 }];
      return prev;
    });
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleTrackOrder = () => {
    if (!trackQuery.trim()) return setTrackResult(null);
    const query = trackQuery.toLowerCase().trim();
    const result = orders.find(o => o.id.toLowerCase() === query || o.phone.toLowerCase() === query);
    setTrackResult(result ? result : 'not_found');
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alertCustom('Keranjang kosong. Pilih produk terlebih dahulu.');
    if (!formData.name || !formData.phone || !formData.address || !formData.kecamatan) {
      return alertCustom('Mohon lengkapi semua data pengiriman.');
    }
    if (!selectedDistributorObj) return alertCustom('Kecamatan belum didukung.');

    setIsSubmitting(true);
    const orderId = 'ORD-' + Math.floor(Math.random() * 1000000);
    const orderItemsText = cart.map(item => `${item.qty}x ${item.name}`).join(', ');
    const totalHarga = getCartTotal();

    const newOrder = {
      id: orderId,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date().toISOString(),
      type: 'online',
      customer: formData.name,
      phone: formData.phone,
      address: formData.address,
      area: formData.kecamatan,
      distributor: selectedDistributorObj.name,
      itemsText: orderItemsText,
      total: totalHarga,
      status: 'proses'
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setTrackQuery(orderId);
    setTrackResult(newOrder);

    try {
      const formPayload = new FormData();
      formPayload.append('orderId', orderId);
      formPayload.append('name', formData.name);
      formPayload.append('phone', formData.phone);
      formPayload.append('address', formData.address);
      formPayload.append('kecamatan', formData.kecamatan);
      formPayload.append('distributor', selectedDistributorObj.name);
      formPayload.append('products', orderItemsText);
      formPayload.append('total', totalHarga);
      await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formPayload });
    } catch (error) { console.error('Error:', error); }

    const waText = `*PESANAN BARU DRIZCE*\n\nID: ${orderId}\n\n*Data Pemesan:*\nNama: ${formData.name}\nNo HP: ${formData.phone}\nAlamat: ${formData.address}\nKecamatan: ${formData.kecamatan}\n\n*Detail Pesanan:*\n${cart.map(item => `- ${item.name} x${item.qty} = Rp ${(item.price * item.qty).toLocaleString('id-ID')}`).join('\n')}\n\n*Total Tagihan: Rp ${totalHarga.toLocaleString('id-ID')}*\n\nMohon segera diproses.`;
    const waUrl = `https://wa.me/${selectedDistributorObj.phone}?text=${encodeURIComponent(waText)}`;
    
    setIsSubmitting(false);
    setSubmitStatus('Berhasil dialihkan ke WhatsApp!');
    setTimeout(() => { setCart([]); setFormData({ name: '', phone: '', address: '', kecamatan: '' }); setSubmitStatus(null); }, 3000);
    window.open(waUrl, '_blank');
  };

  const [alertMsg, setAlertMsg] = useState(null);
  const alertCustom = (msg) => { setAlertMsg(msg); setTimeout(() => setAlertMsg(null), 3000); };

  if (currentView === 'login') return <LoginScreen logo={getDirectImageUrl(siteConfig.logo)} distributors={distributors} onLogin={(role, user) => { setCurrentView(role); setCurrentUser(user); }} onCancel={() => setCurrentView('home')} />;
  if (currentView === 'admin') return <AdminDashboard logo={getDirectImageUrl(siteConfig.logo)} siteConfig={siteConfig} orders={orders} products={products} setProducts={setProducts} distributors={distributors} setDistributors={setDistributors} onUpdateConfig={setSiteConfig} onLogout={() => { setCurrentView('home'); setCurrentUser(null); }} />;
  if (currentView === 'mitra') return <MitraDashboard logo={getDirectImageUrl(siteConfig.logo)} user={currentUser} products={products} orders={orders} onAddOrder={(newOrder) => setOrders(prev => [newOrder, ...prev])} onUpdateStatus={(id, newStatus) => setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))} onLogout={() => { setCurrentView('home'); setCurrentUser(null); }} />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      
      {/* NAVBAR RESPONSIVE (DIPERBAIKI UNTUK HP) */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2 z-50">
              <img src={getDirectImageUrl(siteConfig.logo)} alt="Logo Drizce" className="h-10 w-auto rounded object-contain bg-black p-1" />
            </div>
            
            {/* Menu Desktop */}
            <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-600 items-center">
              <a href="#" className="hover:text-green-600 font-bold">Home</a>
              <a href="#produk" className="hover:text-green-600 font-bold">Produk</a>
              <a href="#cara-pesan" className="hover:text-green-600 font-bold">Cara Pesan</a>
              <button onClick={() => setCurrentView('login')} className="bg-green-600 text-white px-5 py-2 rounded-full font-bold hover:bg-green-700 transition shadow-md shadow-green-200 flex items-center gap-2">
                 <User size={16} /> Login Mitra
              </button>
            </div>

            {/* Tombol Hamburger Mobile */}
            <div className="md:hidden flex items-center z-50">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-800 p-2 focus:outline-none">
                {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Menu Dropdown Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-t border-gray-100 px-6 py-6 shadow-xl flex flex-col space-y-4 animate-in slide-in-from-top-4 duration-200 z-40">
             <a href="#" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-800 border-b pb-2 border-gray-50">Home</a>
             <a href="#produk" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-800 border-b pb-2 border-gray-50">Produk</a>
             <a href="#cara-pesan" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-800 border-b pb-2 border-gray-50">Cara Pesan</a>
             <button onClick={() => {setIsMobileMenuOpen(false); setCurrentView('login');}} className="w-full mt-4 bg-green-600 text-white px-4 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-200">
               <User size={18} /> Login Mitra / Admin
             </button>
          </div>
        )}
      </nav>

      {alertMsg && <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 animate-bounce">{alertMsg}</div>}

      {/* HERO SECTION */}
      <div className="bg-gradient-to-br from-green-50 to-green-200 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(0, 200, 0, 0.4) 0%, transparent 50%)' }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center text-center md:text-left">
          <div className="order-2 md:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4 whitespace-pre-line">{siteConfig.headline}</h1>
            <p className="text-base md:text-lg text-gray-700 mb-8">{siteConfig.subheadline}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="#produk" className="bg-green-600 text-white px-6 py-3.5 rounded-full font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                Pesan Sekarang <ChevronRight size={18} />
              </a>
              <a href="#lacak" className="bg-white text-green-700 border border-green-200 px-6 py-3.5 rounded-full font-semibold hover:bg-green-50 transition flex items-center justify-center gap-2 shadow-sm">
                <Search size={18} /> Lacak Pesanan
              </a>
            </div>
          </div>
          <div className="order-1 md:order-2 flex justify-center relative mb-8 md:mb-0">
              <div className="w-48 h-64 md:w-64 md:h-80 bg-gradient-to-b from-green-300 to-green-500 rounded-3xl transform rotate-6 absolute -z-10 blur-xl opacity-50"></div>
              <img src={getDirectImageUrl(siteConfig.heroImage)} alt="Drizce Banner" className="rounded-3xl shadow-2xl object-cover h-64 w-48 md:h-96 md:w-64 border-4 border-white transform -rotate-3 hover:rotate-0 transition duration-500 bg-white" />
          </div>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Sisi Kiri (Produk & Info) */}
          <div className="flex-1 space-y-12">
            
            <section id="produk">
              <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Package className="text-green-600" /> Pilih Produk</h2>
                 <span className="text-sm text-gray-500 font-bold hidden sm:block">{products.length} Varian tersedia</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {products.map(product => {
                  const cartItem = cart.find(item => item.id === product.id);
                  const qty = cartItem ? cartItem.qty : 0;
                  return (
                    <div key={product.id} className="bg-white rounded-2xl p-3 md:p-4 shadow-sm border border-gray-100 hover:shadow-md transition group flex flex-col">
                      <div className="h-28 md:h-40 bg-gray-50 rounded-xl mb-3 md:mb-4 overflow-hidden flex items-center justify-center p-2">
                        <img src={getDirectImageUrl(product.image)} alt={product.name} className="h-full object-contain group-hover:scale-105 transition duration-300 mix-blend-multiply" />
                      </div>
                      <h3 className="font-bold text-gray-800 mb-1 text-sm md:text-base leading-tight flex-1">{product.name}</h3>
                      <p className="text-green-600 font-bold mb-3 md:mb-4 text-sm md:text-base">Rp {product.price.toLocaleString('id-ID')} <span className="text-[10px] md:text-xs text-gray-400 font-normal">/ {product.unit}</span></p>
                      {qty === 0 ? (
                        <button onClick={() => updateCart(product, 1)} className="w-full bg-green-50 text-green-700 py-2 md:py-2.5 rounded-xl font-bold hover:bg-green-600 hover:text-white transition text-xs md:text-sm">+ Tambah</button>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 rounded-xl p-1 md:p-1.5 border border-gray-200">
                          <button onClick={() => updateCart(product, -1)} className="p-1 md:p-2 hover:bg-white rounded-lg text-gray-600 shadow-sm"><Minus size={14} /></button>
                          <span className="font-bold text-gray-800 w-6 text-center text-sm">{qty}</span>
                          <button onClick={() => updateCart(product, 1)} className="p-1 md:p-2 bg-white rounded-lg text-green-600 shadow-sm border border-gray-100"><Plus size={14} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section id="cara-pesan" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8 text-center">Cara Pesan Sangat Mudah</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                <div className="hidden md:block absolute top-6 left-1/8 right-1/8 h-0.5 bg-green-100 z-0"></div>
                {[{ step: 1, title: 'Pilih Produk', icon: <ShoppingCart className="text-green-600" /> }, { step: 2, title: 'Isi Alamat', icon: <MapPin className="text-green-600" /> }, { step: 3, title: 'Terhubung Distributor', icon: <Phone className="text-green-600" /> }, { step: 4, title: 'Air Dikirim', icon: <Truck className="text-green-600" /> }].map((item) => (
                  <div key={item.step} className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-green-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm mb-2 md:mb-3">{item.icon}</div>
                    <h3 className="font-bold text-gray-800 text-xs md:text-sm">{item.step}. {item.title}</h3>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 overflow-hidden">
               <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="text-green-600" /> Transaksi Terakhir (Live)</h2>
               <div className="overflow-x-auto pb-2">
                 <table className="w-full text-sm text-left text-gray-500 min-w-[500px]">
                   <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                     <tr>
                       <th className="px-4 py-3 rounded-tl-lg">Pelanggan</th>
                       <th className="px-4 py-3">Area Distribusi</th>
                       <th className="px-4 py-3">Produk</th>
                       <th className="px-4 py-3 rounded-tr-lg">Status</th>
                     </tr>
                   </thead>
                   <tbody>
                     {orders.slice(0, 3).map(order => (
                       <tr key={order.id} className="border-b last:border-0">
                         <td className="px-4 py-3 font-bold text-gray-900">{order.customer}</td>
                         <td className="px-4 py-3">{order.area}</td>
                         <td className="px-4 py-3 font-medium text-gray-700 truncate max-w-[150px]">{order.itemsText}</td>
                         <td className="px-4 py-3">
                           {order.status === 'proses' && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Diproses</span>}
                           {order.status === 'kirim' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Dikirim</span>}
                           {order.status === 'selesai' && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Selesai</span>}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </section>
          </div>

          {/* Sisi Kanan (Sticky Sidebar) */}
          <div className="w-full lg:w-96">
            <div className="sticky top-24 space-y-6">
              
              <div id="lacak" className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Cek Status Pesanan</h3>
                <input type="text" value={trackQuery} onChange={(e) => setTrackQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTrackOrder()} placeholder="Masukkan no HP / ID Pesanan" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none mb-3 bg-gray-50" />
                <button onClick={handleTrackOrder} className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition text-sm shadow-md">Lacak Pesanan <Search size={16} /></button>

                {trackResult && trackResult !== 'not_found' && (
                  <div className="mt-5 p-5 bg-green-50 rounded-2xl border border-green-200 text-sm animate-in fade-in zoom-in duration-300 shadow-sm">
                     <p className="font-bold text-gray-800 mb-3 border-b border-green-200 pb-2">Detail Pesanan Anda</p>
                     <div className="space-y-2">
                       <p className="flex justify-between items-center"><span className="text-gray-500 font-bold">Status:</span> 
                          {trackResult.status === 'proses' && <span className="font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-lg">Sedang Diproses ⏳</span>}
                          {trackResult.status === 'kirim' && <span className="font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">Sedang Dikirim 🚚</span>}
                          {trackResult.status === 'selesai' && <span className="font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">Selesai ✅</span>}
                       </p>
                       <p className="flex justify-between"><span className="text-gray-500 font-bold">ID:</span> <span className="font-mono font-bold text-gray-800">{trackResult.id}</span></p>
                       <p className="flex justify-between"><span className="text-gray-500 font-bold">Kurir:</span> <span className="font-bold text-gray-800 text-right">{trackResult.distributor}</span></p>
                       <p className="flex justify-between pt-2 border-t border-green-200/50"><span className="text-gray-500 font-bold">Total:</span> <span className="font-black text-green-700 text-base">Rp {trackResult.total.toLocaleString('id-ID')}</span></p>
                     </div>
                  </div>
                )}
                {trackResult === 'not_found' && (
                  <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-200 text-sm font-bold text-red-600 text-center animate-in fade-in duration-300">Pesanan tidak ditemukan. Periksa kembali ID atau Nomor HP.</div>
                )}
              </div>
              
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-green-100/50 border border-green-50">
                <h3 className="text-xl font-extrabold text-gray-800 mb-4 border-b pb-4">Keranjang Anda</h3>
                <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-gray-400"><ShoppingCart className="mx-auto mb-3 opacity-40" size={36} /><p className="text-sm font-bold">Keranjang masih kosong</p></div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-xl">
                        <div className="flex items-center gap-3">
                          <img src={getDirectImageUrl(item.image)} alt={item.name} className="w-12 h-12 rounded-lg bg-white object-contain border border-gray-200 p-1" />
                          <div><p className="font-bold text-gray-800">{item.name}</p><p className="text-gray-500 font-bold text-xs">{item.qty} {item.unit}</p></div>
                        </div>
                        <p className="font-bold text-green-700">Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="flex justify-between items-center mb-6 py-4 border-t border-b border-gray-100">
                    <span className="font-bold text-gray-600">Total Harga</span>
                    <span className="text-2xl font-extrabold text-green-700">Rp {getCartTotal().toLocaleString('id-ID')}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Nama Lengkap" className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700" />
                  </div>
                  <div>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="No. WhatsApp" className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-700" />
                  </div>
                  <div>
                    <textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} placeholder="Alamat Pengiriman Lengkap" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none resize-none font-bold text-gray-700"></textarea>
                  </div>
                  <div>
                    <select name="kecamatan" value={formData.kecamatan} onChange={handleInputChange} className="w-full border border-gray-300 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white font-bold text-gray-700">
                      <option value="">-- Pilih Kecamatan / Area --</option>
                      {distributors.map(dist => (
                        <option key={dist.id} value={dist.area}>{dist.area}</option>
                      ))}
                    </select>
                  </div>

                  <div className={`p-4 rounded-xl border flex gap-3 transition-all ${selectedDistributorObj ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                    <CheckCircle className={selectedDistributorObj ? "text-green-500 shrink-0" : "text-gray-400 shrink-0"} size={20} />
                    <div className="text-xs">
                      <p className="font-bold text-gray-700">Dikirim dari:</p>
                      <p className={selectedDistributorObj ? "text-green-700 font-bold text-sm mt-0.5" : "text-gray-500 mt-0.5"}>
                        {selectedDistributorObj ? selectedDistributorObj.name : "Pilih kecamatan dulu"}
                      </p>
                    </div>
                  </div>

                  {submitStatus ? (
                    <div className="bg-green-100 text-green-800 p-4 rounded-xl text-center text-sm font-bold animate-pulse">{submitStatus}</div>
                  ) : (
                    <button onClick={handleSubmitOrder} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-green-200 text-base">
                      {isSubmitting ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : <><Phone size={20} /> Pesan via WhatsApp</>}
                    </button>
                  )}
                  <p className="text-[10px] text-center text-gray-400 font-bold">*Pesanan diteruskan ke distributor terdekat.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- KOMPONEN LOGIN ---
function LoginScreen({ logo, distributors, onLogin, onCancel }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      onLogin('admin', { role: 'admin', name: 'Administrator' });
      return;
    } 
    const foundDistributor = distributors.find(d => d.area.toLowerCase() === username.toLowerCase());
    if (foundDistributor && password === 'mitra') {
      onLogin('mitra', { role: 'mitra', name: foundDistributor.name, area: foundDistributor.area });
    } else {
      setError('Akses ditolak. Coba username area Anda (cth: gubeng) dan pass: mitra');
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-green-100">
        <div className="text-center mb-8">
          <img src={logo} alt="Logo" className="h-16 mx-auto mb-4 bg-black p-2 rounded object-contain" />
          <h2 className="text-2xl font-bold text-gray-800">Login Sistem</h2>
          <p className="text-gray-500 text-sm font-bold">Masuk sebagai Admin atau Mitra</p>
        </div>
        {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-bold mb-4 border border-red-100 text-center">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Username Area / Admin</label>
            <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none font-bold" placeholder="Cth: admin / gubeng" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none font-bold" placeholder="******" />
          </div>
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition mt-4 shadow-md shadow-green-200">Login</button>
          <button type="button" onClick={onCancel} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition mt-2">Kembali ke Web</button>
        </form>
      </div>
    </div>
  );
}

// --- KOMPONEN DASHBOARD ADMIN ---
function AdminDashboard({ logo, siteConfig, orders, products, setProducts, distributors, setDistributors, onUpdateConfig, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [localConfig, setLocalConfig] = useState(siteConfig);
  const [saveStatus, setSaveStatus] = useState('');
  const [filterArea, setFilterArea] = useState('Semua');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showDistModal, setShowDistModal] = useState(false);
  const [editDist, setEditDist] = useState(null);

  const filteredOrders = orders.filter(o => {
    let matchArea = filterArea === 'Semua' || o.area === filterArea;
    let matchDate = true;
    if (filterStartDate && filterEndDate) {
      const oDate = new Date(o.timestamp);
      const sDate = new Date(filterStartDate);
      const eDate = new Date(filterEndDate + 'T23:59:59');
      matchDate = oDate >= sDate && oDate <= eDate;
    }
    return matchArea && matchDate;
  });

  const totalFilteredPendapatan = filteredOrders.reduce((sum, order) => sum + order.total, 0);
  const totalGlobalPendapatan = orders.reduce((sum, order) => sum + order.total, 0);

  const handleConfigChange = (e) => setLocalConfig({ ...localConfig, [e.target.name]: e.target.value });
  const handleSaveConfig = (e) => { e.preventDefault(); onUpdateConfig(localConfig); setSaveStatus('Pengaturan berhasil disimpan!'); setTimeout(() => setSaveStatus(''), 3000); };
  const handleSaveProduct = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const newProd = { id: editProduct ? editProduct.id : Date.now(), name: fd.get('name'), price: parseInt(fd.get('price')), unit: fd.get('unit'), image: fd.get('image') || '' };
    if (editProduct) setProducts(prev => prev.map(p => p.id === editProduct.id ? newProd : p)); else setProducts(prev => [...prev, newProd]);
    setShowProductModal(false);
  };
  const handleDeleteProduct = (id) => { if(window.confirm('Hapus produk ini?')) setProducts(prev => prev.filter(p => p.id !== id)); };
  const handleSaveDist = (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    const newDist = { id: editDist ? editDist.id : Date.now(), area: fd.get('area'), name: fd.get('name'), phone: fd.get('phone') };
    if (editDist) setDistributors(prev => prev.map(d => d.id === editDist.id ? newDist : d)); else setDistributors(prev => [...prev, newDist]);
    setShowDistModal(false);
  };
  const handleDeleteDist = (id) => { if(window.confirm('Hapus Area Cabang ini?')) setDistributors(prev => prev.filter(d => d.id !== id)); };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed inset-y-0 left-0 z-30 bg-green-900 text-white flex flex-col transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex absolute -right-3 top-8 bg-green-700 text-white rounded-full p-1 shadow-md hover:bg-green-600 z-40 border-2 border-green-900">
          <ChevronLeft size={16} className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="p-4 flex-1 overflow-x-hidden">
          <div className={`flex items-center mb-8 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {isCollapsed ? <img src={logo} alt="Logo" className="h-8 bg-black p-1 rounded object-contain" /> : <img src={logo} alt="Logo" className="h-10 bg-black p-1 rounded object-contain" />}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-green-200 hover:text-white"><X size={24}/></button>
          </div>
          
          {!isCollapsed && (
            <div className="mb-8 p-4 bg-green-800 rounded-xl border border-green-700 truncate">
               <p className="text-xs text-green-300">Login sebagai:</p>
               <p className="font-bold text-white truncate">Administrator</p>
            </div>
          )}

          <ul className="space-y-2">
            <li onClick={() => {setActiveTab('dashboard'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'dashboard' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}><BarChart3 size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Overview</span>}</li>
            <li onClick={() => {setActiveTab('laporan'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'laporan' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}><FileBarChart size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Laporan Penjualan</span>}</li>
            <li onClick={() => {setActiveTab('produk'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'produk' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}><Package size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Kelola Produk</span>}</li>
            <li onClick={() => {setActiveTab('distributor'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'distributor' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}><User size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Data Distributor</span>}</li>
            <li onClick={() => {setActiveTab('pengaturan'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'pengaturan' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}><Settings size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Pengaturan Web</span>}</li>
          </ul>
        </div>
        <div className="p-4 border-t border-green-800">
          <button onClick={onLogout} className={`flex items-center gap-2 text-red-300 hover:text-white font-bold transition w-full p-3 rounded-xl hover:bg-red-600 ${isCollapsed ? 'justify-center' : ''}`}><LogOut size={18} className="min-w-max"/> {!isCollapsed && <span>Keluar Admin</span>}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 p-1"><Menu size={24}/></button>
            <span className="font-bold text-gray-800">Admin DRIZCE</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-10">
          <h1 className="text-2xl font-bold text-gray-800 mb-8 capitalize">{activeTab === 'dashboard' ? 'Ringkasan Sistem' : activeTab}</h1>
          
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-bold mb-1">Total Pendapatan Global</p>
                    <h3 className="text-3xl font-black text-green-600">Rp {totalGlobalPendapatan.toLocaleString('id-ID')}</h3>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-bold mb-1">Total Pesanan Tercatat</p>
                    <h3 className="text-3xl font-black text-blue-600">{orders.length} Pesanan</h3>
                 </div>
            </div>
          )}

          {activeTab === 'laporan' && (
            <div className="space-y-6 max-w-6xl mx-auto">
               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Area Cabang</label>
                     <select value={filterArea} onChange={(e)=>setFilterArea(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none bg-white font-bold text-gray-700 focus:border-green-500">
                        <option value="Semua">Semua Area (Global)</option>
                        {distributors.map(d => <option key={d.id} value={d.area}>{d.area} - {d.name}</option>)}
                     </select>
                  </div>
                  <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
                     <input type="date" value={filterStartDate} onChange={(e)=>setFilterStartDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 font-bold text-gray-700" />
                  </div>
                  <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
                     <input type="date" value={filterEndDate} onChange={(e)=>setFilterEndDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 font-bold text-gray-700" />
                  </div>
                  <div className="w-full md:w-auto">
                     <button onClick={()=>{setFilterArea('Semua'); setFilterStartDate(''); setFilterEndDate('');}} className="w-full md:w-auto bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-6 py-2.5 rounded-xl transition text-sm whitespace-nowrap"><Filter size={16} className="inline mr-1"/> Reset Filter</button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-100 p-5 rounded-2xl">
                     <p className="text-gray-500 text-sm font-bold mb-1">Pendapatan (Berdasarkan Filter)</p>
                     <h3 className="text-2xl font-black text-green-700">Rp {totalFilteredPendapatan.toLocaleString('id-ID')}</h3>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl">
                     <p className="text-gray-500 text-sm font-bold mb-1">Total Transaksi (Berdasarkan Filter)</p>
                     <h3 className="text-2xl font-black text-blue-700">{filteredOrders.length} Pesanan</h3>
                  </div>
               </div>

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-600 border-b">
                       <tr>
                         <th className="px-6 py-4">ID & Waktu</th>
                         <th className="px-6 py-4">Sumber & Area</th>
                         <th className="px-6 py-4">Pelanggan</th>
                         <th className="px-6 py-4">Total Harga</th>
                         <th className="px-6 py-4">Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {filteredOrders.length === 0 ? (
                         <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500 font-bold">Tidak ada data pada periode / area tersebut.</td></tr>
                       ) : (
                         filteredOrders.map(order => (
                           <tr key={order.id}>
                             <td className="px-6 py-4"><span className="font-mono text-xs font-bold text-gray-700">{order.id}</span><br/><span className="text-xs text-gray-400 font-bold">{order.date}</span></td>
                             <td className="px-6 py-4">{order.type === 'pos' ? <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[10px] font-bold">POS</span> : <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">WEB</span>}<br/><span className="text-xs text-gray-500 font-bold">{order.area}</span></td>
                             <td className="px-6 py-4 font-bold text-gray-800">{order.customer}</td>
                             <td className="px-6 py-4 font-bold text-green-600">Rp {order.total.toLocaleString('id-ID')}</td>
                             <td className="px-6 py-4 uppercase text-xs font-bold text-gray-500">{order.status}</td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'produk' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-6xl mx-auto">
               <div className="flex justify-between items-center mb-6 border-b pb-4">
                 <h3 className="font-bold text-gray-800 text-lg">Daftar Produk Aktif</h3>
                 <button onClick={()=>{setEditProduct(null); setShowProductModal(true)}} className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm"><Plus size={16}/> Tambah Produk</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {products.map(p => (
                    <div key={p.id} className="border border-gray-200 rounded-2xl p-4 flex flex-col bg-gray-50">
                       <img src={getDirectImageUrl(p.image)} alt={p.name} className="h-32 object-contain bg-white border border-gray-100 rounded-xl mb-4 w-full p-2" />
                       <h4 className="font-bold text-gray-800">{p.name}</h4>
                       <p className="text-green-600 font-bold mb-4">Rp {p.price.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-500 font-bold">/ {p.unit}</span></p>
                       <div className="flex gap-2 mt-auto">
                          <button onClick={()=>{setEditProduct(p); setShowProductModal(true)}} className="flex-1 bg-white border border-gray-300 text-gray-600 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:bg-gray-100"><Edit size={14}/> Edit</button>
                          <button onClick={()=>handleDeleteProduct(p.id)} className="flex-1 bg-white border border-red-200 text-red-500 py-2 rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:bg-red-50"><Trash2 size={14}/> Hapus</button>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'distributor' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-5xl mx-auto">
               <div className="p-6 border-b flex flex-col md:flex-row gap-4 justify-between md:items-center bg-gray-50/50">
                 <div>
                   <h3 className="font-bold text-gray-800 text-lg">Data Mitra / Cabang</h3>
                   <p className="text-xs text-gray-500 font-bold">Mengelola area layanan untuk Halaman Web & Login Mitra.</p>
                 </div>
                 <button onClick={()=>{setEditDist(null); setShowDistModal(true)}} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 flex items-center gap-2"><Plus size={16}/> Tambah Cabang</button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-gray-50 text-gray-600 border-b">
                     <tr>
                       <th className="px-6 py-4">Kecamatan (Area)</th>
                       <th className="px-6 py-4">Nama Toko Mitra</th>
                       <th className="px-6 py-4">No WhatsApp (Sistem)</th>
                       <th className="px-6 py-4 text-center">Aksi</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {distributors.map(dist => (
                       <tr key={dist.id} className="hover:bg-gray-50/50 transition">
                         <td className="px-6 py-4 font-bold text-gray-800">{dist.area}</td>
                         <td className="px-6 py-4 font-bold text-gray-700">{dist.name}</td>
                         <td className="px-6 py-4 text-green-600 font-mono font-bold">{dist.phone}</td>
                         <td className="px-6 py-4 flex justify-center gap-3">
                           <button onClick={()=>{setEditDist(dist); setShowDistModal(true)}} className="text-blue-600 hover:text-blue-800 bg-blue-50 p-2 rounded-lg"><Edit size={16}/></button>
                           <button onClick={()=>handleDeleteDist(dist.id)} className="text-red-600 hover:text-red-800 bg-red-50 p-2 rounded-lg"><Trash2 size={16}/></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {activeTab === 'pengaturan' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 max-w-3xl">
              <form onSubmit={handleSaveConfig} className="space-y-6">
                {saveStatus && <div className="bg-green-100 text-green-800 p-4 rounded-xl font-bold animate-pulse">{saveStatus}</div>}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">URL Logo (Google Drive / Direct Link)</label>
                  <input type="text" name="logo" value={localConfig?.logo || ''} onChange={handleConfigChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none font-bold text-gray-700 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">URL Foto Banner (Google Drive / Direct Link)</label>
                  <input type="text" name="heroImage" value={localConfig?.heroImage || ''} onChange={handleConfigChange} className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none font-bold text-gray-700 focus:border-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Headline Utama</label>
                  <textarea name="headline" value={localConfig?.headline || ''} onChange={handleConfigChange} rows="2" className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none resize-none font-bold text-gray-700 focus:border-green-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Sub-Headline Utama</label>
                  <textarea name="subheadline" value={localConfig?.subheadline || ''} onChange={handleConfigChange} rows="2" className="w-full px-4 py-3 rounded-xl border border-gray-300 outline-none resize-none font-bold text-gray-700 focus:border-green-500"></textarea>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-200 w-full sm:w-auto">Simpan Pengaturan</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL PRODUK */}
      {showProductModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
               <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">{editProduct ? 'Edit' : 'Tambah'} Produk Baru</h2>
               <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nama Produk</label>
                    <input name="name" defaultValue={editProduct?.name || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-[2]">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Harga (Rp)</label>
                      <input type="number" name="price" defaultValue={editProduct?.price || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-600 mb-1">Satuan</label>
                      <input name="unit" defaultValue={editProduct?.unit || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">URL Gambar (Google Drive)</label>
                    <input name="image" defaultValue={editProduct?.image || ''} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t mt-6">
                    <button type="button" onClick={()=>setShowProductModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Batal</button>
                    <button type="submit" className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition shadow-md shadow-green-200">Simpan</button>
                  </div>
               </form>
            </div>
         </div>
      )}

      {/* MODAL DISTRIBUTOR */}
      {showDistModal && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
               <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-3">{editDist ? 'Edit' : 'Tambah'} Area Cabang</h2>
               <form onSubmit={handleSaveDist} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Kecamatan / Nama Area</label>
                    <input name="area" defaultValue={editDist?.area || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Nama Toko Mitra</label>
                    <input name="name" defaultValue={editDist?.name || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">No WhatsApp (Penerima Order)</label>
                    <input name="phone" defaultValue={editDist?.phone || ''} required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 outline-none focus:border-green-500 font-bold" />
                  </div>
                  <div className="flex gap-3 pt-4 border-t mt-6">
                    <button type="button" onClick={()=>setShowDistModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Batal</button>
                    <button type="submit" className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition shadow-md shadow-gray-300">Simpan Cabang</button>
                  </div>
               </form>
            </div>
         </div>
      )}

    </div>
  );
}

// --- KOMPONEN DASHBOARD MITRA ---
function MitraDashboard({ logo, user, products, orders, onAddOrder, onUpdateStatus, onLogout }) {
  const [activeTab, setActiveTab] = useState('pesanan');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  
  const myOrders = orders.filter(o => o.area === user?.area);
  const onlineOrders = myOrders.filter(o => o.type === 'online');
  const totalPendapatanMitra = myOrders.reduce((sum, order) => sum + order.total, 0);
  const unprocessedCount = onlineOrders.filter(o => o.status === 'proses').length;
  
  const [posCart, setPosCart] = useState([]);
  const [posCustomer, setPosCustomer] = useState('');
  const [posWa, setPosWa] = useState('');
  const [posAlamat, setPosAlamat] = useState('');
  const [showCheckoutPopup, setShowCheckoutPopup] = useState(false);

  const addToPosCart = (product) => {
    setPosCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { ...product, qty: 1 }];
    });
  };
  const updatePosQty = (id, change) => { setPosCart(prev => prev.map(item => item.id === id ? { ...item, qty: Math.max(0, item.qty + change) } : item).filter(item => item.qty > 0)); };
  const posTotal = posCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleHold = () => { if(posCart.length === 0) return alert('Keranjang kasir kosong!'); alert('Pesanan berhasil di-Hold.'); setPosCart([]); };
  const handleBayarClick = () => { if(posCart.length === 0) return alert('Keranjang kasir kosong!'); setShowCheckoutPopup(true); };

  const processCheckout = async (kirimNota) => {
    if (kirimNota && !posWa) { alert('Mohon isi Nomor WhatsApp pelanggan untuk mengirim nota!'); return; }
    
    const orderId = 'POS-' + Math.floor(Math.random() * 1000000);
    const orderItemsText = posCart.map(item => `${item.qty}x ${item.name}`).join(', ');
    
    const newPosOrder = {
      id: orderId, date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), timestamp: new Date().toISOString(), type: 'pos',
      customer: posCustomer || 'Walk-in (Offline)', phone: posWa || '-', address: posAlamat || 'Pembelian di Tempat', area: user?.area || '-', distributor: user?.name || '-', itemsText: orderItemsText, total: posTotal, status: 'selesai' 
    };
    onAddOrder(newPosOrder);

    try {
      const formPayload = new FormData();
      formPayload.append('orderId', orderId); formPayload.append('name', newPosOrder.customer); formPayload.append('phone', newPosOrder.phone); formPayload.append('address', newPosOrder.address); formPayload.append('kecamatan', newPosOrder.area); formPayload.append('distributor', newPosOrder.distributor); formPayload.append('products', orderItemsText); formPayload.append('total', posTotal);
      await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: formPayload });
    } catch (error) { console.error('Error:', error); }

    if (kirimNota) {
      let text = `*NOTA PEMBELIAN DRIZCE*\n\nNo. Transaksi: ${orderId}\nPelanggan: ${newPosOrder.customer}\n\n*Detail Pesanan:*\n`;
      posCart.forEach(item => { text += `- ${item.name} x${item.qty} = Rp ${(item.price * item.qty).toLocaleString('id-ID')}\n`; });
      text += `\n*Total Tagihan: Rp ${posTotal.toLocaleString('id-ID')}*\n\nTerima kasih telah berbelanja di ${user?.name}!`;
      let wa = posWa.replace(/[^0-9]/g, ''); if (wa.startsWith('0')) wa = '62' + wa.substring(1);
      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(text)}`, '_blank');
    }
    alert(`Pembayaran Berhasil & Tersimpan!\nTotal: Rp ${posTotal.toLocaleString('id-ID')}`);
    setPosCart([]); setPosCustomer(''); setPosWa(''); setPosAlamat(''); setShowCheckoutPopup(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

      <div className={`fixed inset-y-0 left-0 z-30 bg-green-900 text-white flex flex-col transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden md:flex absolute -right-3 top-8 bg-green-700 text-white rounded-full p-1 shadow-md hover:bg-green-600 z-40 border-2 border-green-900">
          <ChevronLeft size={16} className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className="p-4 flex-1 overflow-x-hidden">
          <div className={`flex items-center mb-8 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {isCollapsed ? <img src={logo} alt="Logo" className="h-8 bg-black p-1 rounded object-contain" /> : <img src={logo} alt="Logo" className="h-10 bg-black p-1 rounded object-contain" />}
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-green-200 hover:text-white"><X size={24}/></button>
          </div>

          {!isCollapsed && (
            <div className="mb-8 p-4 bg-green-800 rounded-xl border border-green-700 truncate">
               <p className="text-xs text-green-300">Login sebagai:</p>
               <p className="font-bold text-white truncate">{user?.name}</p>
            </div>
          )}

          <ul className="space-y-2">
            <li onClick={() => {setActiveTab('pesanan'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition relative ${activeTab === 'pesanan' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}>
               <ListOrdered size={18} className="min-w-max"/> 
               {!isCollapsed && <span className="truncate flex-1 font-bold">Pesanan Online Web</span>}
               {unprocessedCount > 0 && <span className={`bg-red-500 text-white font-bold rounded-full flex items-center justify-center ${isCollapsed ? 'absolute -top-1 -right-1 w-5 h-5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}>{unprocessedCount}</span>}
            </li>
            <li onClick={() => {setActiveTab('pos'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'pos' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}>
               <Calculator size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Kasir / POS (Offline)</span>}
            </li>
            <li onClick={() => {setActiveTab('laporan'); setIsSidebarOpen(false);}} className={`flex gap-3 items-center p-3 rounded-xl cursor-pointer transition ${activeTab === 'laporan' ? 'text-green-900 bg-white shadow-md' : 'text-green-100 hover:bg-green-800'} ${isCollapsed ? 'justify-center' : ''}`}>
               <FileBarChart size={18} className="min-w-max"/> {!isCollapsed && <span className="truncate font-bold">Laporan Penjualan</span>}
            </li>
          </ul>
        </div>
        <div className="p-4 border-t border-green-800">
          <button onClick={onLogout} className={`flex items-center gap-2 text-red-300 hover:text-white font-bold transition w-full p-3 rounded-xl hover:bg-red-600 ${isCollapsed ? 'justify-center' : ''}`}><LogOut size={18} className="min-w-max"/> {!isCollapsed && <span>Keluar Mitra</span>}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center z-10 relative">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600 p-1 relative">
            <Menu size={24}/>
            {unprocessedCount > 0 && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
          </button>
          <span className="font-bold text-gray-800">Mitra DRIZCE</span>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">

          {activeTab === 'pesanan' && (
             <div className="max-w-6xl mx-auto">
               {unprocessedCount > 0 && (
                 <div className="bg-yellow-50 border border-yellow-200 p-4 mb-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                   <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><Bell size={24} className="animate-pulse" /></div>
                   <div><h3 className="font-bold text-yellow-800">Pesanan Masuk Baru!</h3><p className="text-sm text-yellow-700">Terdapat <strong>{unprocessedCount} pesanan</strong> yang masih menunggu diproses.</p></div>
                 </div>
               )}

               <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                   <div><h2 className="text-xl font-bold text-gray-800">Pesanan Masuk (Web)</h2><p className="text-sm text-gray-500 font-bold">Area Anda: {user?.area}</p></div>
                 </div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50 text-gray-600">
                       <tr>
                         <th className="px-6 py-4">ID & Waktu</th>
                         <th className="px-6 py-4">Pelanggan</th>
                         <th className="px-6 py-4">Detail Pesanan</th>
                         <th className="px-6 py-4">Alamat Pengiriman</th>
                         <th className="px-6 py-4">Ubah Status</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100">
                       {onlineOrders.length === 0 ? (
                          <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500 font-bold">Belum ada pesanan online dari wilayah ini.</td></tr>
                       ) : (
                         onlineOrders.map(order => (
                           <tr key={order.id} className={order.status === 'proses' ? 'bg-yellow-50/30' : ''}>
                             <td className="px-6 py-4 whitespace-nowrap"><span className="font-mono font-bold text-gray-700">{order.id}</span><br/><span className="text-xs text-gray-500 font-bold">{order.date}</span></td>
                             <td className="px-6 py-4"><p className="font-bold text-gray-800">{order.customer}</p><p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-bold"><Phone size={10}/> {order.phone}</p></td>
                             <td className="px-6 py-4 text-gray-700 font-bold">{order.itemsText}<br/><span className="font-black text-green-600">Rp {order.total.toLocaleString('id-ID')}</span></td>
                             <td className="px-6 py-4 text-gray-600 max-w-xs font-bold">{order.address}</td>
                             <td className="px-6 py-4">
                               <select value={order.status} onChange={(e) => onUpdateStatus(order.id, e.target.value)} className={`border text-xs rounded-lg block w-full p-2.5 outline-none font-bold cursor-pointer ${order.status === 'selesai' ? 'bg-green-50 text-green-800 border-green-200' : order.status === 'kirim' ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200 shadow-sm shadow-yellow-100'}`}>
                                 <option value="proses">⏳ Diproses</option><option value="kirim">🚚 Dikirim</option><option value="selesai">✅ Selesai</option>
                               </select>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'pos' && (
             <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto h-full pb-10 md:pb-0">
                <div className="flex-1 flex flex-col">
                   <h2 className="text-xl font-bold text-gray-800 mb-4">Mesin Kasir / Point of Sale</h2>
                   <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                      {products.map(p => (
                         <div key={p.id} onClick={() => addToPosCart(p)} className="bg-white border border-gray-200 p-4 rounded-xl cursor-pointer hover:border-green-500 hover:shadow-md transition active:scale-95 flex flex-col items-center text-center">
                            <img src={getDirectImageUrl(p.image)} alt={p.name} className="h-24 object-contain mb-3 bg-gray-50 rounded-lg w-full" />
                            <h4 className="font-bold text-gray-800 text-sm mb-1">{p.name}</h4>
                            <p className="text-green-600 font-bold text-xs">Rp {p.price.toLocaleString('id-ID')}</p>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="w-full lg:w-[400px] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col h-full max-h-[85vh]">
                   <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl"><h3 className="font-bold text-gray-800 flex items-center gap-2"><Receipt size={18}/> Transaksi Kasir</h3></div>
                   <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
                      <input type="text" placeholder="Nama Pembeli (Opsional)" value={posCustomer} onChange={(e)=>setPosCustomer(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none font-bold text-gray-700" />
                      <input type="tel" placeholder="No WhatsApp (Untuk Kirim Nota)" value={posWa} onChange={(e)=>setPosWa(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none font-bold text-gray-700" />
                      <textarea placeholder="Alamat (Opsional)" rows="2" value={posAlamat} onChange={(e)=>setPosAlamat(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl outline-none resize-none font-bold text-gray-700"></textarea>
                   </div>
                   <div className="flex-1 overflow-auto p-4 space-y-4">
                      {posCart.length === 0 ? (<div className="text-center text-gray-400 py-10 text-sm font-bold">Keranjang kosong.</div>) : (
                         posCart.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm border-b pb-3 border-gray-100">
                               <div className="flex-1 pr-2"><p className="font-bold text-gray-800 truncate">{item.name}</p><p className="text-green-600 font-medium text-xs font-bold">Rp {item.price.toLocaleString('id-ID')}</p></div>
                               <div className="flex items-center gap-2 bg-gray-50 rounded-lg border border-gray-200 p-1">
                                  <button onClick={() => updatePosQty(item.id, -1)} className="p-1.5 hover:bg-white rounded"><Minus size={14}/></button>
                                  <span className="w-6 font-bold text-center">{item.qty}</span>
                                  <button onClick={() => updatePosQty(item.id, 1)} className="p-1.5 hover:bg-white rounded text-green-600"><Plus size={14}/></button>
                               </div>
                            </div>
                         ))
                      )}
                   </div>
                   <div className="p-4 bg-gray-50 rounded-b-2xl border-t border-gray-200">
                      <div className="flex justify-between items-center mb-4"><span className="font-bold text-gray-600">Total Tagihan</span><span className="text-2xl font-black text-green-700">Rp {posTotal.toLocaleString('id-ID')}</span></div>
                      <div className="flex gap-2">
                         <button onClick={handleHold} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-yellow-100"><PauseCircle size={16}/> Hold</button>
                         <button onClick={handleBayarClick} className="flex-[2] bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md shadow-green-200"><CheckCircle size={16}/> Bayar</button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeTab === 'laporan' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-5xl mx-auto">
               <h2 className="text-xl font-bold text-gray-800 mb-6">Laporan Penjualan Area ({user?.area})</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-green-50 border border-green-100 p-5 rounded-2xl"><p className="text-gray-500 text-sm font-bold mb-2">Total Pendapatan Terkumpul</p><h3 className="text-3xl font-black text-green-700">Rp {totalPendapatanMitra.toLocaleString('id-ID')}</h3></div>
                  <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl"><p className="text-gray-500 text-sm font-bold mb-2">Total Semua Transaksi</p><h3 className="text-3xl font-black text-blue-700">{myOrders.length} Pesanan</h3></div>
               </div>
               <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Riwayat Semua Transaksi</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-600">
                   <thead className="bg-gray-50 text-gray-700">
                     <tr><th className="px-4 py-3">Tanggal / ID</th><th className="px-4 py-3">Sumber</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Total Harga</th><th className="px-4 py-3">Status</th></tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {myOrders.length === 0 ? (
                       <tr><td colSpan="5" className="px-4 py-8 text-center font-bold">Belum ada data penjualan.</td></tr>
                     ) : (
                       myOrders.map(order => (
                         <tr key={order.id}>
                           <td className="px-4 py-3"><span className="font-mono text-xs font-bold text-gray-700">{order.id}</span><br/><span className="text-xs text-gray-400 font-bold">{order.date}</span></td>
                           <td className="px-4 py-3">{order.type === 'pos' ? <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold">POS Offline</span> : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">Web Online</span>}</td>
                           <td className="px-4 py-3 font-bold text-gray-800">{order.customer}</td>
                           <td className="px-4 py-3 font-bold text-green-600">Rp {order.total.toLocaleString('id-ID')}</td>
                           <td className="px-4 py-3 uppercase text-xs font-black">{order.status}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>
          )}
        </div>
      </div>

      {showCheckoutPopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[60]">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm"><CheckCircle size={40} /></div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Simpan & Bayar</h3>
              <p className="text-gray-500 text-sm mb-6 font-bold">Total tagihan: <strong className="text-gray-800">Rp {posTotal.toLocaleString('id-ID')}</strong>. Kirim nota ke WhatsApp?</p>
              <div className="space-y-3">
                <button onClick={() => processCheckout(true)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-md shadow-green-200"><Send size={18} /> Ya, Kirim Nota (WA)</button>
                <button onClick={() => processCheckout(false)} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl">Tidak, Selesai Saja</button>
                <button onClick={() => setShowCheckoutPopup(false)} className="w-full text-gray-400 font-bold py-2 text-sm hover:text-gray-600">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}