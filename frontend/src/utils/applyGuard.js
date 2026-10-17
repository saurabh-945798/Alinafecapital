export async function guardStartApplication({ productId, navigate, api }) {
  const target = productId ? `/apply?product=${encodeURIComponent(productId)}` : "/apply";
  const signupTarget = `/register?next=${encodeURIComponent(target)}&intent=apply`;

  if (!api) {
    navigate(signupTarget);
    return;
  }

  try {
    const { data } = await api.get("/profile/me");
    const profile = data?.data || data?.profile || data?.item || null;
    const kycStatus = String(profile?.kycStatus || "").toLowerCase();
    const completion = Number(profile?.profileCompletion || 0);

    if (kycStatus === "verified") {
      navigate(productId ? `${target}&reuseKyc=1` : `${target}?reuseKyc=1`);
      return;
    }

    if (kycStatus === "pending") {
      navigate("/dashboard/kyc-status");
      return;
    }

    if (kycStatus === "rejected" || completion < 100) {
      navigate("/dashboard/profile-completion");
      return;
    }

    navigate("/dashboard/profile-completion");
  } catch {
    navigate(signupTarget);
  }
}
