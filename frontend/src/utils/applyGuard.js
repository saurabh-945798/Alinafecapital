export async function guardStartApplication({ productId, navigate }) {
  const target = productId ? `/apply?product=${encodeURIComponent(productId)}` : "/apply";
  navigate(target);
}
