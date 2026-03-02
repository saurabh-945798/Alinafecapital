import { getKycGate } from "./kycGate";

export async function guardStartApplication({ productId, navigate, api }) {
  const target = productId ? `/apply?product=${encodeURIComponent(productId)}` : "/apply";
  const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : "";

  if (!token) {
    navigate(`/login?next=${encodeURIComponent(target)}`);
    return;
  }

  try {
    const { data } = await api.get("/profile/me");
    const profile = data?.item ?? data?.data ?? null;
    const gate = getKycGate(profile);

    if (!gate.canApply) {
      navigate(`/dashboard?kyc=required&next=${encodeURIComponent(target)}`);
      return;
    }

    navigate(target);
  } catch {
    navigate("/dashboard?kyc=required");
  }
}

