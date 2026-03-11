export async function guardStartApplication({ productId, navigate }) {
  const target = productId ? `/apply?product=${encodeURIComponent(productId)}` : "/apply";
  const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : "";

  if (!token) {
    navigate(`/login?next=${encodeURIComponent(target)}`);
    return;
  }

  navigate(target);
}
