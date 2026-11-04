import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Star,
  Percent,
  Phone,
  Scissors,
  Check,
  Edit2,
  Camera,
  Trash2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  UploadCloud,
  X
} from 'lucide-react';
import { Barber } from '../types';

interface BarbersViewProps {
  barbers: Barber[];
  onCreateBarber: (barber: Partial<Barber> & { create_credentials?: boolean; email?: string; password?: string }) => Promise<void>;
  onUpdateBarber: (id: string, barber: Partial<Barber> & { update_credentials?: boolean; email?: string; password?: string }) => Promise<void>;
}

export const BarbersView: React.FC<BarbersViewProps> = ({
  barbers,
  onCreateBarber,
  onUpdateBarber,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('+591 ');
  const [specialty, setSpecialty] = useState('Fades y Diseños Urbanos');
  const [commissionRate, setCommissionRate] = useState(50);

  // Credentials state
  const [manageCredentials, setManageCredentials] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreate = () => {
    setEditingBarber(null);
    setName('');
    setNickname('');
    setPhotoUrl('');
    setPhone('+591 ');
    setSpecialty('Fades y Diseños Urbanos');
    setCommissionRate(50);
    setManageCredentials(false);
    setEmail('');
    setPassword('Apolo2026!');
    setShowPassword(false);
    setIsSaving(false);
    setSaveSuccess(false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Barber) => {
    setEditingBarber(b);
    setName(b.name);
    setNickname(b.nickname || '');
    setPhotoUrl(b.photo_url || '');
    setPhone(b.phone || '+591 ');
    setSpecialty(b.specialty || '');
    setCommissionRate(Math.round(b.commission_rate * 100));
    setManageCredentials(Boolean(b.user_email));
    setEmail(b.user_email || '');
    setPassword('');
    setShowPassword(false);
    setIsSaving(false);
    setSaveSuccess(false);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  // Process and compress image file to lightweight Base64
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to base64 JPEG at 85% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Por favor ingresa el nombre completo del barbero.');
      return;
    }

    if (manageCredentials && !email.trim()) {
      setErrorMessage('Si habilitas credenciales de acceso, debes ingresar un correo electrónico.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      if (editingBarber) {
        await onUpdateBarber(editingBarber.id, {
          name: name.trim(),
          nickname: nickname.trim(),
          photo_url: photoUrl,
          phone: phone.trim(),
          specialty: specialty.trim(),
          commission_rate: commissionRate / 100,
          update_credentials: manageCredentials,
          email: manageCredentials ? email.trim().toLowerCase() : undefined,
          password: manageCredentials && password ? password : undefined,
        });
      } else {
        await onCreateBarber({
          name: name.trim(),
          nickname: nickname.trim(),
          photo_url: photoUrl,
          phone: phone.trim(),
          specialty: specialty.trim(),
          commission_rate: commissionRate / 100,
          rating: 5.0,
          is_active: true,
          create_credentials: manageCredentials,
          email: manageCredentials ? email.trim().toLowerCase() : undefined,
          password: manageCredentials ? (password || 'Apolo2026!') : undefined,
        });
      }
      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Error al guardar barbero:', err);
      setErrorMessage(err.message || 'Error al guardar los datos del barbero.');
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#0d2347] to-[#102a54] p-6 rounded-2xl border border-[#3b82f6]/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#1a4fd6]/40 text-[#60a5fa] border border-[#3b82f6]/40">
              Staff & Sillones
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-heading text-white">
            Equipo de Barberos & Profesionales
          </h2>
          <p className="text-xs md:text-sm text-[#94a3b8] mt-1">
            Gestiona los perfiles de tu equipo, sube sus fotos reales y asígnales credenciales para acceder al sistema.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] hover:brightness-110 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-[#1a4fd6]/25 border border-[#60a5fa]/30 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Barbero</span>
        </button>
      </div>

      {/* Barbers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {barbers.map((barber) => (
          <div
            key={barber.id}
            className="p-5 rounded-2xl bg-[#0d2347]/70 border border-[#3b82f6]/20 hover:border-[#f0b429]/50 transition-all flex flex-col justify-between group shadow-xl relative overflow-hidden"
          >
            {/* Active Pill top corner */}
            <div className="absolute top-4 right-4">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  barber.is_active
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${barber.is_active ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                {barber.is_active ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div>
              {/* Photo & Rating Badge */}
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#f0b429] p-0.5 bg-[#0a1628] shadow-lg shadow-[#f0b429]/20 flex items-center justify-center">
                  {barber.photo_url ? (
                    <img
                      src={barber.photo_url}
                      alt={barber.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-[#1a4fd6] to-[#0ea5e9] text-white font-extrabold text-xl rounded-xl">
                      {barber.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 px-1.5 py-0.5 rounded-md bg-[#0a1628] border border-[#f0b429] text-[10px] font-bold text-[#f0b429] flex items-center gap-0.5 shadow">
                  <Star className="w-3 h-3 fill-[#f0b429]" />
                  <span>{barber.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Names */}
              <div className="text-center mb-3">
                <h3 className="font-heading font-extrabold text-base text-white">{barber.name}</h3>
                <div className="text-xs font-semibold text-[#f0b429]">
                  {barber.nickname || 'Master Barber'}
                </div>
              </div>

              {/* Specialty & Details */}
              <div className="space-y-2 mb-4">
                <div className="p-2.5 rounded-xl bg-[#0a1628]/80 border border-[#3b82f6]/20 text-center">
                  <div className="text-[10px] font-bold text-[#60a5fa] uppercase tracking-wider mb-0.5">
                    Especialidad
                  </div>
                  <div className="text-xs text-white font-medium">{barber.specialty}</div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#102a54]/50 border border-[#3b82f6]/15 text-xs">
                  <span className="text-[#94a3b8] flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-[#f0b429]" />
                    Comisión:
                  </span>
                  <span className="font-bold text-white">
                    {Math.round(barber.commission_rate * 100)}%
                  </span>
                </div>

                {barber.phone && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#102a54]/50 border border-[#3b82f6]/15 text-xs">
                    <span className="text-[#94a3b8] flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-[#60a5fa]" />
                      Celular:
                    </span>
                    <span className="text-[#c8deff] font-medium">{barber.phone}</span>
                  </div>
                )}

                {/* Login credentials badge */}
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0a1628]/90 border border-[#3b82f6]/15 text-xs">
                  <span className="text-[#94a3b8] flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-[#f0b429]" />
                    Login:
                  </span>
                  {barber.user_email ? (
                    <span className="text-emerald-400 font-semibold truncate max-w-[130px]" title={barber.user_email}>
                      {barber.user_email}
                    </span>
                  ) : (
                    <span className="text-[#64748b] italic">Sin acceso</span>
                  )}
                </div>
              </div>
            </div>

            {/* Edit button */}
            <div className="pt-3 border-t border-[#3b82f6]/15">
              <button
                onClick={() => handleOpenEdit(barber)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#102a54] hover:bg-[#1a4fd6]/40 text-[#c8deff] hover:text-white text-xs font-semibold border border-[#3b82f6]/25 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Perfil & Acceso</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit Barber */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a1628]/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d2347] border border-[#3b82f6]/40 p-6 shadow-2xl relative my-8">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#102a54] transition-all"
              title={saveSuccess ? "Salir" : "Cerrar"}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-heading font-bold text-lg text-white mb-1">
              {editingBarber ? 'Editar Perfil del Barbero' : 'Registrar Nuevo Barbero'}
            </h3>
            <p className="text-xs text-[#94a3b8] mb-4">
              Completa los datos del profesional y sube su fotografía real.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo Upload Section */}
              <div className="p-4 rounded-xl bg-[#0a1628]/90 border border-[#3b82f6]/30">
                <label className="block text-xs font-bold text-[#c8deff] mb-2">Fotografía Real del Barbero</label>
                <div className="flex items-center gap-4">
                  {/* Photo Preview Circle */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-dashed border-[#60a5fa] hover:border-[#f0b429] cursor-pointer bg-[#102a54] flex items-center justify-center group shrink-0 transition-all shadow-md"
                    title="Haz clic para seleccionar o cambiar foto"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-[#60a5fa] group-hover:scale-110 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Photo Actions */}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-[#1a4fd6] hover:bg-[#2563eb] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{photoUrl ? 'Cambiar Fotografía' : 'Subir Foto Real'}</span>
                      </button>

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 text-xs font-medium border border-rose-500/30 transition-all"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-[#94a3b8]">
                      Sube una foto desde tu equipo o celular (JPG, PNG o WEBP). Se optimizará automáticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: David Salazar"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Apodo / Título</label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Ej: El Mago"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#c8deff] mb-1">Comisión (%)</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    required
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Especialidad Principal</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ej: Fade Militar, Barbas Tradicionales, etc."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8deff] mb-1">Teléfono Celular</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+591 7XXXXXXX"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a1628] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                />
              </div>

              {/* Login Credentials Section */}
              <div className="p-4 rounded-xl bg-[#0a1628]/90 border border-[#3b82f6]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#f0b429]" />
                    <span className="text-xs font-bold text-white">Credenciales de Acceso (Login)</span>
                  </div>
                  <input
                    type="checkbox"
                    id="manage_credentials"
                    checked={manageCredentials}
                    onChange={(e) => setManageCredentials(e.target.checked)}
                    className="rounded border-[#3b82f6]/40 text-[#1a4fd6] focus:ring-0 cursor-pointer"
                  />
                </div>

                {manageCredentials && (
                  <div className="space-y-3 pt-2 border-t border-[#3b82f6]/20 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#c8deff] mb-1">
                        Correo de Acceso (Email)
                      </label>
                      <input
                        type="email"
                        required={manageCredentials}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="barbero@apolodigital.lat"
                        className="w-full px-3.5 py-2 rounded-xl bg-[#0d2347] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#c8deff] mb-1">
                        {editingBarber ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña Inicial'}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={manageCredentials && !editingBarber}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className="w-full px-3.5 py-2 rounded-xl bg-[#0d2347] border border-[#3b82f6]/30 text-white text-xs focus:outline-none focus:border-[#60a5fa] pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#94a3b8]">
                      El barbero podrá ingresar al sistema para ver su calendario de citas y clientes de su sillón.
                    </p>
                  </div>
                )}
              </div>

              {/* Error Feedback */}
              {errorMessage && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
                  <span className="w-2 h-2 rounded-full bg-rose-400 mt-1 shrink-0"></span>
                  <span className="flex-1">{errorMessage}</span>
                </div>
              )}

              {/* Success Feedback */}
              {saveSuccess && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="flex-1 font-medium">
                    {editingBarber ? '¡Cambios guardados con éxito!' : '¡Barbero registrado con éxito!'} Haz clic en <strong>Salir</strong> para volver al panel.
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    saveSuccess
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-[#102a54] text-[#c8deff] hover:text-white border border-[#3b82f6]/30'
                  }`}
                >
                  {saveSuccess ? 'Salir' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4fd6] to-[#2563eb] hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-[#1a4fd6]/30 disabled:opacity-50 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>{editingBarber ? '✓ Guardado' : '✓ Registrado'}</span>
                    </>
                  ) : (
                    <span>{editingBarber ? 'Guardar Cambios' : 'Registrar Barbero'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
