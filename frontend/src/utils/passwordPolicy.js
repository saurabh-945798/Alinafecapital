const COMMON = new Set(["password","password123","qwerty123","letmein123","welcome123","admin123","alinafe123"]);
const tokens = (value="") => String(value||"").toLowerCase().split(/[^a-z0-9]+/).filter((x)=>x.length>=3);
export const passwordChecks = (password="", {fullName="",email=""}={}) => {
  const p=String(password||""); const lower=p.toLowerCase(); const identity=[...tokens(fullName),...tokens(String(email).split("@")[0])];
  return { length:p.length>=12, upper:/[A-Z]/.test(p), lower:/[a-z]/.test(p), number:/\d/.test(p), special:/[^A-Za-z0-9]/.test(p), identity:!identity.some((t)=>lower.includes(t)), common:!COMMON.has(lower) };
};
export const passwordIsStrong=(password,identity)=>Object.values(passwordChecks(password,identity)).every(Boolean);
export const generateStrongPassword=()=>{
  const upper="ABCDEFGHJKLMNPQRSTUVWXYZ", lower="abcdefghijkmnopqrstuvwxyz", nums="23456789", special="!@#$%&*?";
  const all=upper+lower+nums+special;
  const pick=(chars)=>chars[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*chars.length)];
  const chars=[pick(upper),pick(lower),pick(nums),pick(special)]; while(chars.length<16) chars.push(pick(all));
  for(let i=chars.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];} return chars.join("");
};
