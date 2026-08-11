import logoImage from "../../../images/logo.png";
import { RestockTechSignature } from "../Brand/RestockTechLogo.jsx";

export default function TransitionOverlay({ visible, title = "Please wait", message = "Loading your next step..." }) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[2rem] border border-white/20 bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 shadow-inner">
          <img src={logoImage} alt="Alinafe Capital" className="h-12 w-auto object-contain" />
        </div>
        <div className="mx-auto mt-5 h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-[#002D5B]" />
        <h2 className="mt-5 text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{message}</p>
        <div className="mt-5 flex justify-center">
          <RestockTechSignature label="Powered by" logoClassName="h-9 w-auto" />
        </div>
      </div>
    </div>
  );
}
