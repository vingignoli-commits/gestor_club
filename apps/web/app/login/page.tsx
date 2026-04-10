export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
      <div className="w-full rounded-[2rem] bg-panel p-8 shadow-card">
        <p className="text-sm uppercase tracking-[0.18em] text-accent">Acceso</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">Ingreso administrativo</h1>
        <div className="mt-6 space-y-3">
          <input className="w-full rounded-2xl border border-ink/10 px-4 py-3" placeholder="Email" />
          <input
            className="w-full rounded-2xl border border-ink/10 px-4 py-3"
            placeholder="Contrasena"
            type="password"
          />
        </div>
        <button className="mt-5 w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-white">
          Ingresar
        </button>
      </div>
    </div>
  );
}
